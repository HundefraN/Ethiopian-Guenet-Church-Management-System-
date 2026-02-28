import React, { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, RotateCcw, ZoomIn, ZoomOut, Maximize, Move } from 'lucide-react';
import { ds } from '../utils/darkStyles';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface ImageCropperProps {
    image: string;
    onCropComplete: (croppedImage: Blob) => void;
    onCancel: () => void;
    aspect?: number;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
    image,
    onCropComplete,
    onCancel,
    aspect = 1
}) => {
    const { isDark } = useTheme();
    const { t } = useLanguage();
    const d = ds(isDark);

    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropChange = (crop: Point) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onRotationChange = (rotation: number) => {
        setRotation(rotation);
    };

    const onCropAreaComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (
        imageSrc: string,
        pixelCrop: Area,
        rotation = 0
    ): Promise<Blob | null> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return null;
        }

        const rotRad = (rotation * Math.PI) / 180;
        const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
            image.width,
            image.height,
            rotation
        );

        canvas.width = bBoxWidth;
        canvas.height = bBoxHeight;

        ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
        ctx.rotate(rotRad);
        ctx.translate(-image.width / 2, -image.height / 2);

        ctx.drawImage(image, 0, 0);

        const data = ctx.getImageData(
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height
        );

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.putImageData(data, 0, 0);

        return new Promise((resolve) => {
            canvas.toBlob((file) => {
                resolve(file);
            }, 'image/jpeg');
        });
    };

    const rotateSize = (width: number, height: number, rotation: number) => {
        const rotRad = (rotation * Math.PI) / 180;
        return {
            width:
                Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
            height:
                Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
        };
    };

    const handleDone = async () => {
        if (croppedAreaPixels) {
            const croppedImage = await getCroppedImg(image, croppedAreaPixels, rotation);
            if (croppedImage) {
                onCropComplete(croppedImage);
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative w-full max-w-4xl h-[85vh] flex flex-col rounded-[2.5rem] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.5)] border border-white/10"
                style={d.modalContent}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                            <Maximize className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">
                                {t('common.cropImage')}
                            </h3>
                            <p className="text-blue-400/80 text-xs font-bold uppercase tracking-widest mt-0.5">
                                {t('common.professionalCropper')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-3 rounded-2xl bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Cropper Body */}
                <div className="relative flex-1 bg-[#0A0C10] overflow-hidden">
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspect}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onRotationChange={onRotationChange}
                        onCropComplete={onCropAreaComplete}
                        classes={{
                            containerClassName: "bg-[#0A0C10]",
                            mediaClassName: "max-h-full",
                            cropAreaClassName: "border-2 border-blue-500 shadow-[0_0_0_100vw_rgba(0,0,0,0.7)]"
                        }}
                    />

                    {/* Quick Guide */}
                    <div className="absolute top-4 left-4 z-10 hidden md:flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
                        <Move size={14} className="text-blue-400" />
                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-tighter">
                            Drag to Move & Re-center
                        </span>
                    </div>
                </div>

                {/* Controls */}
                <div className="p-8 space-y-8 bg-[#0F1116] border-t border-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Zoom Control */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ZoomIn size={16} className="text-blue-400" />
                                    <span className="text-sm font-bold text-white/90 uppercase tracking-tight">Zoom Level</span>
                                </div>
                                <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-md">
                                    {Math.round(zoom * 100)}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.1}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                            />
                        </div>

                        {/* Rotation Control */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <RotateCcw size={16} className="text-indigo-400" />
                                    <span className="text-sm font-bold text-white/90 uppercase tracking-tight">Rotation Angle</span>
                                </div>
                                <span className="text-xs font-mono text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-md">
                                    {rotation}°
                                </span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={360}
                                step={1}
                                value={rotation}
                                onChange={(e) => setRotation(Number(e.target.value))}
                                className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/5">
                        <button
                            onClick={onCancel}
                            className="px-8 py-3.5 rounded-2xl bg-white/5 text-gray-400 font-bold text-sm tracking-tight hover:bg-white/10 hover:text-white transition-all active:scale-95 border border-white/5"
                        >
                            {t('common.discardCrop')}
                        </button>
                        <button
                            onClick={handleDone}
                            className="flex items-center gap-2 px-10 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:scale-105 active:scale-95 font-black text-sm shadow-[0_8px_32px_rgba(79,70,229,0.3)] transition-all"
                        >
                            <Check size={20} strokeWidth={3} />
                            <span>{t('common.applyCrop')}</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ImageCropper;
