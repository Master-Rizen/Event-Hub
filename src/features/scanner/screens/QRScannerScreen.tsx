import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { collection, query, where, getDocs, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuthStore } from '../../../app/store/authStore';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Loader2, Camera, UserCheck, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { Button } from '../../../shared/ui/Button/Button';
import { cn } from '../../../shared/lib/utils';

export const QRScannerScreen: React.FC = () => {
  const { user } = useAuthStore();
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    attendeeName?: string;
  } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isStopping, setIsStopping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = "reader";
  const startupTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isCooldown, setIsCooldown] = useState(false);
  const lastScannedRef = useRef<string | null>(null);

  const stopScanner = async () => {
    if (isStopping) return;
    setIsStopping(true);

    if (startupTimerRef.current) {
      clearTimeout(startupTimerRef.current);
      startupTimerRef.current = null;
    }
    
    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        // Properly destroy instance if possible, though html5-qrcode.stop usually suffices
      }
    } catch (err) {
      console.warn("Scanner: Graceful stop failed", err);
    } finally {
      setCameraActive(false);
      setIsStopping(false);
    }
  };

  const startScanner = async () => {
    setError(null);
    setScanResult(null);
    setCameraActive(true);
    
    // Give state/DOM time to render the reader div
    startupTimerRef.current = setTimeout(async () => {
      try {
        const container = document.getElementById(readerId);
        if (!container) {
          setError("Scanner container missing. Please refresh.");
          setCameraActive(false);
          return;
        }

        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(readerId);
        }

        await scannerRef.current.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          onScanSuccess,
          onScanFailure
        ).catch(err => {
           // Direct catch for start failures
           throw err;
        });
      } catch (err: any) {
        console.error("Scanner Start Error:", err);
        setError(`Failed: ${err?.message || "Check camera permissions"}`);
        setCameraActive(false);
      }
    }, 250); 
  };

  const onScanSuccess = async (decodedText: string, resultOrMethod?: any) => {
    if (processing || isCooldown || !decodedText) return;
    
    // Prevent duplicate scans in very quick succession
    if (decodedText === lastScannedRef.current) return;

    const method = resultOrMethod === 'upload' ? 'upload' : 'camera';
    
    console.log(`QRScanner: Scanned text (${method}):`, decodedText);
    setProcessing(true);
    lastScannedRef.current = decodedText;

    const parts = decodedText.split('.');
    if (parts.length !== 3) {
      console.warn("QRScanner: Invalid QR format");
      setProcessing(false);
      return;
    }

    const [eventId, qrSecret, attendeeId] = parts;
    
    try {
      // 1. Verify Event
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        setScanResult({ success: false, message: "Event not found." });
        return;
      }

      const eventData = eventDoc.data();
      
      if (eventData.status !== 'published' && eventData.organizerId !== user?.id) {
        setScanResult({ success: false, message: "Event is pending approval." });
        return;
      }

      if (eventData.organizerId !== user?.id && user?.role !== 'admin') {
        setScanResult({ success: false, message: "Organizer mismatch." });
        return;
      }

      if (eventData.qrSecret !== qrSecret) {
        setScanResult({ success: false, message: "Invalid security signature." });
        return;
      }

      // 2. Verify RSVP
      const rsvpId = `${attendeeId}_${eventId}`;
      const rsvpDoc = await getDoc(doc(db, 'rsvps', rsvpId));
      
      if (!rsvpDoc.exists()) {
        setScanResult({ success: false, message: "User not RSVPed." });
        return;
      }

      const attendeeDoc = await getDoc(doc(db, 'users', attendeeId));
      const attendeeName = attendeeDoc.exists() ? attendeeDoc.data().fullName : "Student";

      // 3. Mark Attendance
      const attendanceId = `att_${rsvpId}`;
      const attendanceDocRef = doc(db, 'events', eventId, 'attendances', attendanceId);
      
      const existingAttendance = await getDoc(attendanceDocRef);
      if (existingAttendance.exists()) {
        setScanResult({ success: true, message: "Already checked in!", attendeeName });
      } else {
        await setDoc(attendanceDocRef, {
          rsvpId,
          eventId,
          attendeeId,
          checkedInAt: new Date().toISOString(),
          checkInMethod: method
        });
        setScanResult({ success: true, message: "Check-in successful!", attendeeName });
      }

      // Start cooldown to allow UI to show result before next scan
      setIsCooldown(true);
      setTimeout(() => {
        setIsCooldown(false);
        lastScannedRef.current = null;
        setScanResult(null); // Auto-clear result to show scanner is ready for next
      }, 2500);

    } catch (err: any) {
      console.error("QRScanner Error:", err);
      setScanResult({ success: false, message: "Processing failed." });
    } finally {
      setProcessing(false);
    }
  };

  const onScanFailure = (err: string) => {
    // Usual for "not found in frame", ignore to avoid console noise
  };

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanResult(null);
    setError(null);
    setProcessing(true);

    try {
      const tempScanner = new Html5Qrcode("offscreen-reader");
      const decodedText = await tempScanner.scanFile(file, true);
      await onScanSuccess(decodedText, 'upload');
    } catch (err: any) {
      console.error("File Scan Error:", err);
      setError("Could not find a valid QR code in this image.");
      setProcessing(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-6 pb-12">
      {/* Offscreen element for file scanning */}
      <div id="offscreen-reader" className="hidden" />
      
      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={onFileUpload}
      />

      {/* Global override for html5-qrcode standard styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        #${readerId} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block !important;
        }
        #${readerId} {
          border: none !important;
        }
      `}} />

      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#1a365d]">Event Check-In</h1>
        <p className="text-[#718096]">Scan attendee QR codes to validate entry.</p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-xl border border-[#e2e8f0]">
        {!cameraActive && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-6 bg-gradient-to-b from-[#f8fafc] to-white">
            <div className="p-5 rounded-full bg-[#1a365d] text-white shadow-lg animate-pulse">
              <Camera size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[#1a365d]">Ready to Scan</h3>
              <p className="text-sm text-[#718096]">
                Position QR codes within the frame. Continuous mode is active.
              </p>
            </div>
            <Button onClick={startScanner} className="w-full h-14 text-lg" size="lg">
              Start Camera Scanner
            </Button>
            
            <div className="w-full flex items-center space-x-3">
              <div className="h-px flex-1 bg-[#e2e8f0]" />
              <span className="text-xs text-[#a0aec0] font-medium uppercase tracking-wider">or</span>
              <div className="h-px flex-1 bg-[#e2e8f0]" />
            </div>

            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()} 
              className="w-full h-12"
              isLoading={processing && !cameraActive}
            >
              Upload & Scan Image
            </Button>
          </div>
        )}

        <div className="relative overflow-hidden bg-[#e2e8f0] min-h-[350px]">
          <div 
            id={readerId} 
            className={cn(
              cameraActive ? "w-full block" : "hidden",
              "absolute inset-0"
            )}
          />
          
          {cameraActive && (
            <div className={cn(
              "absolute inset-0 pointer-events-none border-[30px] border-black/20 flex items-center justify-center z-10 transition-all duration-300",
              processing ? "opacity-0" : "opacity-100"
            )}>
              <div className={cn(
                "w-56 h-56 border-2 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] transition-colors duration-300",
                isCooldown ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]" : "border-[#ed8936]"
              )}></div>
            </div>
          )}
        </div>
        
        {cameraActive && (
          <div className="bg-[#1a365d] p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-white">
              {processing ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span className="text-xs font-medium">Processing...</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs font-medium">Scanner Active</span>
                </>
              )}
            </div>
            <button 
              onClick={stopScanner}
              disabled={isStopping}
              className="text-xs text-white/70 hover:text-white underline font-medium disabled:no-underline disabled:opacity-50"
            >
              {isStopping ? 'Stopping...' : 'Stop Camera'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start space-x-3 text-red-800">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Camera Error</p>
            <p>{error}</p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 p-0 text-red-800 h-auto hover:bg-transparent flex items-center"
              onClick={startScanner}
            >
              <RefreshCw size={14} className="mr-1" />
              Try Again
            </Button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {scanResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-6 rounded-2xl border flex items-start space-x-4 ${scanResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
          >
            <div className={`p-2 rounded-full ${scanResult.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {scanResult.success ? <CheckCircle size={24} /> : <XCircle size={24} />}
            </div>
            <div className="flex-1">
              <h3 className={`font-bold ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {scanResult.message}
              </h3>
              {scanResult.attendeeName && (
                <div className="mt-1 flex items-center text-sm text-green-700">
                  <UserCheck size={14} className="mr-1" />
                  <span>Attendee: {scanResult.attendeeName}</span>
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-4 p-0 text-current hover:bg-transparent underline"
                onClick={() => setScanResult(null)}
              >
                Scan Next
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!scanResult && !error && (
        <div className="bg-[#f7fafc] rounded-xl p-4 text-center">
          <p className="text-xs text-[#718096]">
            Center the attendee's code in the view while the scanner is active. 
            Ensure you have good lighting for best results.
          </p>
        </div>
      )}
    </div>
  );
};
