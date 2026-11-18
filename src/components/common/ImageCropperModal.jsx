import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Upload } from 'lucide-react';
import getCroppedImg from '../../utils/cropImage';

export default function ImageCropperModal({ isOpen, onClose, onSave }) {
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const fileInputRef = useRef(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.readAsDataURL(e.target.files[0]);
      reader.addEventListener('load', () => setImage(reader.result));
    }
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!image) return;
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      onSave(croppedImage);
      handleReset(); // reset for next time
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = () => {
    setImage(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 font-kh-body">
      <div className="bg-[#194350] border border-white/15 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-white">
        <div className="p-6 flex-1 min-h-[400px] flex flex-col">
          {!image ? (
            <div
              className="flex-1 border border-dashed border-white/25 hover:border-[#38BDF8]/70 bg-white/[0.04] rounded-xl flex flex-col items-center justify-center cursor-pointer text-white/80 hover:text-white transition"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="flex items-center gap-2">
                Drop Image or Click here. <Upload className="h-5 w-5" />
              </span>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="flex flex-col flex-1 h-full">
              <div className="relative flex-1 bg-slate-900 min-h-[300px] rounded-xl overflow-hidden">
                <Cropper
                  image={image}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>
              <div className="mt-6">
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(e.target.value)}
                  className="w-full h-2 bg-white/15 rounded-lg appearance-none cursor-pointer accent-[#38BDF8]"
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-between border-t border-white/10">
          <div className="flex gap-6">
            <button
              onClick={handleClose}
              className="text-white/85 hover:text-white font-medium text-sm hover:underline cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleReset}
              className="text-white/85 hover:text-white font-medium text-sm hover:underline cursor-pointer"
            >
              Reset
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={!image}
            className="bg-[#38BDF8] hover:bg-[#56CAF9] text-[#092731] px-8 py-2 rounded-full font-bold text-sm disabled:opacity-50 transition-colors cursor-pointer"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}
