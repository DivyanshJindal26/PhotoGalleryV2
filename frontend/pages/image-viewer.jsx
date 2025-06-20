"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FiX,
  FiPlay,
  FiPause,
  FiZoomIn,
  FiZoomOut,
  FiMaximize,
  FiShare2,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiMinimize,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { SuccessToast, ErrorToast } from "../components/Toast";

export default function ImageViewer({
  photos,
  selectedPhoto,
  onClose,
  onLike,
  onDownload,
  isAdmin = false,
  onDisapprove,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);

  // Drag/Pan state for zoomed images
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Enhanced image caching state
  const [cachedImages, setCachedImages] = useState(new Set());
  const [loadingImages, setLoadingImages] = useState(new Set());
  const imageCache = useRef(new Map());
  const preloadQueue = useRef([]);
  const isPreloading = useRef(false);
  const CACHE_RANGE = 8; // Increased cache range for better performance
  const PRIORITY_RANGE = 2; // Immediate priority for adjacent images

  // Check if the user is in fullscreen mode
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const currentPhoto = photos[currentIndex];

  // Find current photo index
  useEffect(() => {
    const index = photos.findIndex(
      (photo) => photo.fileId === selectedPhoto.fileId
    );
    setCurrentIndex(index >= 0 ? index : 0);
  }, [selectedPhoto, photos]);

  // Auto-play functionality
  useEffect(() => {
    let interval;
    if (isPlaying && photos.length > 1) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % photos.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, photos.length]);

  // Reset drag offset when image changes or zoom is toggled
  useEffect(() => {
    setDragOffset({ x: 0, y: 0 });
  }, [currentIndex, isZoomed]);

  // Enhanced image preloading function with priority
  const preloadImage = useCallback((photo, priority = false) => {
    return new Promise((resolve, reject) => {
      const imageUrl = `/api/photos/${photo.fileId}/view`;

      // Check if already cached
      if (imageCache.current.has(imageUrl)) {
        resolve(imageCache.current.get(imageUrl));
        return;
      }

      // Check if already loading
      if (loadingImages.has(photo.fileId)) {
        // Wait for existing load to complete
        const checkLoaded = () => {
          if (imageCache.current.has(imageUrl)) {
            resolve(imageCache.current.get(imageUrl));
          } else {
            setTimeout(checkLoaded, 50);
          }
        };
        checkLoaded();
        return;
      }

      setLoadingImages((prev) => new Set([...prev, photo.fileId]));

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        imageCache.current.set(imageUrl, img);
        setCachedImages((prev) => new Set([...prev, photo.fileId]));
        setLoadingImages((prev) => {
          const newSet = new Set(prev);
          newSet.delete(photo.fileId);
          return newSet;
        });
        resolve(img);
      };

      img.onerror = () => {
        setLoadingImages((prev) => {
          const newSet = new Set(prev);
          newSet.delete(photo.fileId);
          return newSet;
        });
        reject(new Error(`Failed to load image: ${imageUrl}`));
      };

      img.src = imageUrl;
    });
  }, []);

  // Process preload queue
  const processPreloadQueue = useCallback(async () => {
    if (isPreloading.current || preloadQueue.current.length === 0) return;

    isPreloading.current = true;

    while (preloadQueue.current.length > 0) {
      const batch = preloadQueue.current.splice(0, 2); // Smaller batches for faster processing

      try {
        await Promise.allSettled(
          batch.map(({ photo, priority }) => preloadImage(photo, priority))
        );
      } catch (error) {
        console.warn("Error preloading batch:", error);
      }

      // Minimal delay for priority images, slightly longer for others
      const delay = batch.some((item) => item.priority) ? 10 : 50;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    isPreloading.current = false;
  }, [preloadImage]);

  // Enhanced caching with immediate priority for adjacent images
  useEffect(() => {
    const cacheImagesAroundCurrent = () => {
      if (!photos.length) return;

      // Clear existing queue
      preloadQueue.current = [];

      // Priority images (immediate neighbors)
      const priorityIndices = [];
      for (let offset = -PRIORITY_RANGE; offset <= PRIORITY_RANGE; offset++) {
        const index = currentIndex + offset;
        if (index >= 0 && index < photos.length && index !== currentIndex) {
          priorityIndices.push(index);
        }
      }

      // Regular cache images
      const regularIndices = [];
      const startIndex = Math.max(0, currentIndex - CACHE_RANGE);
      const endIndex = Math.min(photos.length - 1, currentIndex + CACHE_RANGE);

      for (let i = startIndex; i <= endIndex; i++) {
        if (i !== currentIndex && !priorityIndices.includes(i)) {
          regularIndices.push(i);
        }
      }

      // Add priority images first
      priorityIndices.forEach((index) => {
        const photo = photos[index];
        if (
          photo &&
          !cachedImages.has(photo.fileId) &&
          !loadingImages.has(photo.fileId)
        ) {
          preloadQueue.current.push({ photo, priority: true });
        }
      });

      // Add regular images
      regularIndices.forEach((index) => {
        const photo = photos[index];
        if (
          photo &&
          !cachedImages.has(photo.fileId) &&
          !loadingImages.has(photo.fileId)
        ) {
          preloadQueue.current.push({ photo, priority: false });
        }
      });

      // Process the queue
      processPreloadQueue();
    };

    // Immediate execution for current index changes
    const timeoutId = setTimeout(cacheImagesAroundCurrent, 0);
    return () => clearTimeout(timeoutId);
  }, [currentIndex, photos, cachedImages, loadingImages, processPreloadQueue]);

  // Aggressive cleanup with better memory management
  useEffect(() => {
    const cleanupCache = () => {
      const maxCacheSize = Math.min(photos.length, CACHE_RANGE * 3); // More generous cache size

      if (imageCache.current.size > maxCacheSize) {
        const currentRange = new Set();
        const startIndex = Math.max(0, currentIndex - CACHE_RANGE * 1.5);
        const endIndex = Math.min(
          photos.length - 1,
          currentIndex + CACHE_RANGE * 1.5
        );

        for (let i = startIndex; i <= endIndex; i++) {
          if (photos[i]) {
            currentRange.add(`/api/photos/${photos[i].fileId}/view`);
          }
        }

        // Remove images not in current range
        const urlsToRemove = [];
        for (const [url] of imageCache.current) {
          if (!currentRange.has(url)) {
            urlsToRemove.push(url);
          }
        }

        // Remove in batches to avoid blocking
        urlsToRemove.forEach((url) => imageCache.current.delete(url));

        // Update cached images set
        setCachedImages((prev) => {
          const newSet = new Set();
          for (let i = startIndex; i <= endIndex; i++) {
            if (photos[i] && prev.has(photos[i].fileId)) {
              newSet.add(photos[i].fileId);
            }
          }
          return newSet;
        });
      }
    };

    const cleanupTimer = setTimeout(cleanupCache, 10000); // Less frequent cleanup
    return () => clearTimeout(cleanupTimer);
  }, [currentIndex, photos]);

  // Preload current image immediately on mount
  useEffect(() => {
    if (currentPhoto && !cachedImages.has(currentPhoto.fileId)) {
      preloadImage(currentPhoto, true);
    }
  }, [currentPhoto, cachedImages, preloadImage]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const shareImage = async (photo) => {
    const imageDownloadUrl = `/api/photos/${photo.fileId}/download`;

    if (navigator.canShare && navigator.canShare({ files: [] })) {
      try {
        const response = await fetch(imageDownloadUrl);
        if (!response.ok) throw new Error("Failed to fetch image for sharing.");

        const blob = await response.blob();
        const file = new File(
          [blob],
          photo.fileName || `photo-${photo.fileId}.jpg`,
          {
            type: blob.type,
          }
        );

        await navigator.share({
          title: photo.title,
          text: `Check out this photo: ${photo.title}`,
          files: [file],
        });
      } catch (error) {
        toast(<ErrorToast message="Sharing failed." />);
        console.error("Error sharing image:", error);
      }
    } else if (navigator.share) {
      // Fallback: share URL instead
      try {
        await navigator.share({
          title: photo.title,
          text: `Check out this photo: ${photo.title}`,
          url: `${window.location.origin}${imageDownloadUrl}`,
        });
      } catch (error) {
        console.error("Error sharing link:", error);
      }
    } else {
      // Fallback: copy download link
      try {
        await navigator.clipboard.writeText(
          `${window.location.origin}${imageDownloadUrl}`
        );
        toast(<SuccessToast message="Download link copied to clipboard!" />);
      } catch (error) {
        toast(<ErrorToast message="Failed to copy link." />);
      }
    }
  };

  // Handle touch gestures for mobile navigation
  const handleTouchStart = (e) => {
    if (isZoomed) {
      // Handle drag start for zoomed image
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - dragOffset.x,
        y: e.touches[0].clientY - dragOffset.y,
      });
    } else {
      // Handle swipe navigation
      setTouchStartX(e.targetTouches[0].clientX);
    }
  };

  const handleTouchMove = (e) => {
    if (isZoomed && isDragging) {
      // Handle drag move for zoomed image
      e.preventDefault();
      setDragOffset({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (!isZoomed) {
      // Handle swipe navigation
      setTouchEndX(e.targetTouches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    if (isZoomed) {
      setIsDragging(false);
    } else {
      // Handle swipe navigation
      if (!touchStartX || !touchEndX) return;

      const swipeDistance = touchStartX - touchEndX;

      if (swipeDistance > 50) {
        goToNext(); // Swiped left
      } else if (swipeDistance < -50) {
        goToPrevious(); // Swiped right
      }

      setTouchStartX(null);
      setTouchEndX(null);
    }
  };

  // Handle mouse drag for zoomed images
  const handleMouseDown = (e) => {
    if (isZoomed) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isZoomed && isDragging) {
      setDragOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add mouse event listeners
  useEffect(() => {
    if (isZoomed) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isZoomed, isDragging, dragStart]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case "Escape":
          onClose();
          break;
        case " ":
          e.preventDefault();
          togglePlayPause();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [goToPrevious, goToNext, onClose]);

  if (!currentPhoto) return null;

  return (
    <div
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Left Navigation Area */}
      <div
        className="absolute left-0 top-0 w-1/2 h-full flex items-center justify-start pl-4 cursor-default z-10 transition-colors"
        onClick={goToPrevious}
      >
        <FiChevronLeft className="cursor-pointer text-white text-4xl opacity-70 hover:opacity-100 transition-opacity" />
      </div>
      {/* Right Navigation Area */}
      <div
        className="absolute right-0 top-0 w-1/2 h-full flex items-center justify-end pr-4 cursor-default z-10 transition-colors"
        onClick={goToNext}
      >
        <FiChevronRight className="cursor-pointer text-white text-4xl opacity-70 hover:opacity-100 transition-opacity" />
      </div>
      {/* Top Controls */}
      <div className="absolute top-4 left-4 text-white text-lg font-medium z-20">
        {currentIndex + 1} / {photos.length}
      </div>
      <div className="absolute top-4 right-4 flex items-center gap-3 z-20">
        <button
          onClick={togglePlayPause}
          className="cursor-pointer text-white hover:text-yellow-400 transition-colors p-2"
          title={isPlaying ? "Pause slideshow" : "Start slideshow"}
        >
          {isPlaying ? <FiPause size={24} /> : <FiPlay size={24} />}
        </button>

        <button
          onClick={toggleZoom}
          className="cursor-pointer text-white hover:text-yellow-400 transition-colors p-2"
          title={isZoomed ? "Zoom out" : "Zoom in"}
        >
          {isZoomed ? <FiZoomOut size={24} /> : <FiZoomIn size={24} />}
        </button>

        <button
          onClick={toggleFullscreen}
          className="cursor-pointer text-white hover:text-yellow-400 transition-colors p-2"
          title="Fullscreen"
        >
          {isFullscreen ? <FiMinimize size={24} /> : <FiMaximize size={24} />}
        </button>

        <button
          onClick={() => shareImage(currentPhoto)}
          className="cursor-pointer text-white hover:text-yellow-400 transition-colors p-2"
          title="Share"
        >
          <FiShare2 size={24} />
        </button>

        <button
          onClick={() => onDownload(currentPhoto)}
          className="cursor-pointer text-white hover:text-yellow-400 transition-colors p-2"
          title="Download"
        >
          <FiDownload size={24} />
        </button>

        <button
          onClick={onClose}
          className="cursor-pointer text-white hover:text-yellow-400 transition-colors p-2"
          title="Close"
        >
          <FiX size={24} />
        </button>
      </div>
      {/* Main Image */}
      <div className="flex items-center justify-center w-full h-full">
        <img
          src={`/api/photos/${currentPhoto.fileId}/view`}
          alt={currentPhoto.fileName}
          className={`w-full h-full object-contain ${
            isZoomed
              ? "scale-125 z-11 cursor-grab active:cursor-grabbing"
              : "cursor-pointer"
          }`}
          style={{
            filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.5))",
            maxWidth: "100vw",
            maxHeight: "100vh",
            transform: isZoomed
              ? `scale(1.5) translate(${dragOffset.x}px, ${dragOffset.y}px)`
              : "none",
            transition: isDragging ? "none" : "transform 0.2s ease-out", // Faster transition
            willChange: isZoomed ? "transform" : "auto", // Optimize for transforms
          }}
          onMouseDown={handleMouseDown}
          draggable={false}
        />
      </div>
      {/* Bottom Info */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center text-white z-20">
        <h2 className="text-2xl font-bold mb-2">{currentPhoto.title}</h2>
        <p className="text-lg opacity-80 whitespace-nowrap overflow-x-auto">
          {currentPhoto.event} | {currentPhoto.uploader}
        </p>
      </div>
      {/* Bottom Right Controls */}
      <div className="absolute bottom-6 right-6 flex items-center gap-6 z-20">
        {isAdmin && onDisapprove && (
          <button
            onClick={() => onDisapprove(currentPhoto.fileId)}
            className="cursor-pointer bg-red-600 text-white px-6 py-4 rounded-lg hover:bg-red-500 transition-colors text-lg"
            style={{ padding: "10px 8px" }}
          >
            Disapprove
          </button>
        )}

        <button
          onClick={() => onLike(currentPhoto.fileId)}
          className="cursor-pointer bg-white/20 text-white rounded-xl hover:bg-white/30 transition-colors flex items-center text-2xl"
          style={{ padding: "10px 8px" }}
        >
          <span style={{ margin: "0 2px" }}>❤️ {currentPhoto.likes || 0}</span>
        </button>
      </div>
    </div>
  );
}
