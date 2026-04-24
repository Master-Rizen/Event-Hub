import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuthStore } from '../../../app/store/authStore';
import { Input } from '../../../shared/ui/Input/Input';
import { Button } from '../../../shared/ui/Button/Button';
import { Tag } from '../../../shared/ui/Tag/Tag';
import { motion } from 'motion/react';
import { Calendar, MapPin, AlignLeft, Users, ThermometerSun, AlertTriangle, Loader2, Camera, X } from 'lucide-react';

export const CreateEventScreen: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    locationType: 'indoor' as 'indoor' | 'outdoor',
    startTime: '',
    endTime: '',
    capacity: '',
    imageUrl: '',
  });

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [weatherSuggestion, setWeatherSuggestion] = useState<{
    suggestion: string;
    warning: boolean;
  } | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewImage(base64String);
        setForm({ ...form, imageUrl: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setPreviewImage(null);
    setForm({ ...form, imageUrl: '' });
  };
  
  const [loading, setLoading] = useState(false);
  const [checkingWeather, setCheckingWeather] = useState(false);

  const handleLocationBlur = async () => {
    if (form.locationType === 'outdoor' && form.location) {
      setCheckingWeather(true);
      try {
        const res = await fetch(`/api/weather/suggestion?location=${encodeURIComponent(form.location)}`);
        const data = await res.json();
        setWeatherSuggestion({
          suggestion: data.suggestion,
          warning: data.warning
        });
      } catch (error) {
        console.error(error);
      } finally {
        setCheckingWeather(false);
      }
    } else {
      setWeatherSuggestion(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const eventData = {
        organizerId: user.id,
        title: form.title,
        description: form.description,
        location: form.location,
        locationType: form.locationType,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        capacity: form.capacity ? parseInt(form.capacity) : null,
        isCancelled: false,
        status: 'pending',
        imageUrl: form.imageUrl,
        qrSecret: Math.random().toString(36).substring(7),
        weatherSuggestion: weatherSuggestion?.suggestion || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'events'), eventData);
      navigate('/organizer/dashboard');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-8 shadow-sm border border-[#e2e8f0]"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1a365d]">Create Event</h1>
          <p className="text-[#718096]">Your event will be submitted for admin approval before going live.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-[#4a5568] block">Event Image</label>
            {previewImage ? (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-[#e2e8f0]">
                <img 
                  src={previewImage} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-[#e2e8f0] hover:border-[#1a365d] transition-colors cursor-pointer bg-[#f8fafc]">
                <Camera className="text-[#a0aec0] mb-2" size={32} />
                <span className="text-sm text-[#718096]">Click to upload event image</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>

          <Input 
            label="Event Title"
            placeholder="e.g. Free Pizza & Python Workshop"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <div className="space-y-1">
            <label className="text-sm font-medium text-[#4a5568]">Description</label>
            <textarea 
              className="w-full min-h-[120px] rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a365d]"
              placeholder="What's happening? Mention free food, prerequisites, etc."
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              type="datetime-local"
              label="Start Time"
              required
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
            <Input 
              type="datetime-local"
              label="End Time"
              required
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setForm({ ...form, locationType: 'indoor' })}
                className={`flex-1 rounded-lg border p-3 flex flex-col items-center justify-center transition-all ${form.locationType === 'indoor' ? 'bg-[#1a365d] border-[#1a365d] text-white' : 'bg-white text-[#718096]'}`}
              >
                <span>Indoor</span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, locationType: 'outdoor' })}
                className={`flex-1 rounded-lg border p-3 flex flex-col items-center justify-center transition-all ${form.locationType === 'outdoor' ? 'bg-[#1a365d] border-[#1a365d] text-white' : 'bg-white text-[#718096]'}`}
              >
                <span>Outdoor</span>
              </button>
            </div>

            <Input 
              label="Location"
              placeholder="e.g. Student Union, Room 402"
              required
              value={form.location}
              onBlur={handleLocationBlur}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />

            {checkingWeather && (
              <div className="flex items-center text-xs text-[#718096] px-2">
                <Loader2 size={12} className="animate-spin mr-2" />
                Checking weather for outdoor location...
              </div>
            )}

            {weatherSuggestion && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-3 rounded-lg flex items-start space-x-2 text-xs ${weatherSuggestion.warning ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}
              >
                {weatherSuggestion.warning ? <AlertTriangle size={14} className="flex-shrink-0" /> : <ThermometerSun size={14} className="flex-shrink-0" />}
                <span>{weatherSuggestion.suggestion}</span>
              </motion.div>
            )}
          </div>

          <Input 
            type="number"
            label="Capacity (Optional)"
            placeholder="Unlimited if left empty"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />

          <Button type="submit" className="w-full" size="lg" isLoading={loading}>
            Submit for Approval
          </Button>
        </form>
      </motion.div>
    </div>
  );
};
