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

  // Enhanced image caching state - completely background
  const [cachedImages, setCachedImages] = useState(new Set());
  const imageCache = useRef(new Map());
  const preloadWorker = useRef(null);
  const CACHE_RANGE = 5; // Reduced for faster initial loading
  const PRIORITY_RANGE = 1; // Immediate neighbors only

  const currentPhoto = photos[currentIndex];

  // Aggressive background preloading - no delays, no blocking
  const preloadImage = useCallback((photo) => {
    const imageUrl = `/api/photos/${photo.fileId}/view`;

    // Skip if already cached or loading
    if (imageCache.current.has(imageUrl)) return Promise.resolve();

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        imageCache.current.set(imageUrl, img);
        setCachedImages((prev) => new Set([...prev, photo.fileId]));
        resolve();
      };

      img.onerror = () => resolve(); // Don't block on errors
      img.src = imageUrl;
    });
  }, []);

  // Immediate background preloading without queues or delays
  useEffect(() => {
    if (!photos.length || !currentPhoto) return;

    // Cancel any existing preload worker
    if (preloadWorker.current) {
      clearTimeout(preloadWorker.current);
    }

    // Start immediate background preloading
    preloadWorker.current = setTimeout(() => {
      // Preload current image first (highest priority)
      preloadImage(currentPhoto);

      // Then preload adjacent images immediately
      const adjacentIndices = [];
      for (let offset = -PRIORITY_RANGE; offset <= PRIORITY_RANGE; offset++) {
        const index = currentIndex + offset;
        if (index >= 0 && index < photos.length && index !== currentIndex) {
          adjacentIndices.push(index);
        }
      }

      // Preload adjacent images without waiting
      adjacentIndices.forEach((index) => {
        if (photos[index]) preloadImage(photos[index]);
      });

      // Preload remaining images in range (lower priority)
      setTimeout(() => {
        const startIndex = Math.max(0, currentIndex - CACHE_RANGE);
        const endIndex = Math.min(
          photos.length - 1,
          currentIndex + CACHE_RANGE
        );

        for (let i = startIndex; i <= endIndex; i++) {
          if (i !== currentIndex && !adjacentIndices.includes(i) && photos[i]) {
            preloadImage(photos[i]);
          }
        }
      }, 100); // Small delay for non-critical images
    }, 0); // Start immediately

    return () => {
      if (preloadWorker.current) {
        clearTimeout(preloadWorker.current);
      }
    };
  }, [currentIndex, currentPhoto]); // Minimal dependencies

  // Simplified cleanup - less aggressive to avoid interrupting navigation
  useEffect(() => {
    const cleanup = () => {
      if (imageCache.current.size > photos.length * 0.8) {
        // Only cleanup if cache is getting very large
        const keepRange = CACHE_RANGE * 2;
        const startKeep = Math.max(0, currentIndex - keepRange);
        const endKeep = Math.min(photos.length - 1, currentIndex + keepRange);

        const urlsToKeep = new Set();
        for (let i = startKeep; i <= endKeep; i++) {
          if (photos[i]) {
            urlsToKeep.add(`/api/photos/${photos[i].fileId}/view`);
          }
        }

        // Remove old cached images
        for (const [url] of imageCache.current) {
          if (!urlsToKeep.has(url)) {
            imageCache.current.delete(url);
          }
        }

        // Update cached images set
        setCachedImages((prev) => {
          const newSet = new Set();
          for (let i = startKeep; i <= endKeep; i++) {
            if (photos[i] && prev.has(photos[i].fileId)) {
              newSet.add(photos[i].fileId);
            }
          }
          return newSet;
        });
      }
    };

    // Less frequent cleanup
    const cleanupTimer = setTimeout(cleanup, 30000);
    return () => clearTimeout(cleanupTimer);
  }, [currentIndex]); // Only run when index changes

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
    try {
      const imageViewUrl = `/api/photos/${photo.fileId}/download`;

      // Fetch the actual image
      const response = await fetch(imageViewUrl);
      if (!response.ok) throw new Error("Failed to fetch image for sharing.");

      const blob = await response.blob();

      // Get proper file extension from content type or filename
      const getFileExtension = (contentType, fileName) => {
        if (fileName && fileName.includes(".")) {
          return fileName.split(".").pop().toLowerCase();
        }

        const typeMap = {
          "image/jpeg": "jpg",
          "image/jpg": "jpg",
          "image/png": "png",
          "image/gif": "gif",
          "image/webp": "webp",
        };

        return typeMap[contentType] || "jpg";
      };

      const extension = getFileExtension(blob.type, photo.fileName);
      const fileName =
        photo.fileName || `${photo.title || "photo"}.${extension}`;

      // Create file with proper type
      const file = new File([blob], fileName, {
        type: blob.type || "image/jpeg",
      });

      // Check if native file sharing is supported
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // Share the actual image file
        await navigator.share({
          title: photo.title || "Shared Photo",
          text: photo.title
            ? `Check out this photo: ${photo.title}`
            : "Check out this photo!",
          files: [file],
        });
        return;
      }

      // Fallback for browsers that support sharing but not files
      if (navigator.share) {
        // Create a temporary object URL for the image
        const imageUrl = URL.createObjectURL(blob);

        try {
          await navigator.share({
            title: photo.title || "Shared Photo",
            text: photo.title
              ? `Check out this photo: ${photo.title}`
              : "Check out this photo!",
            url: imageUrl,
          });
        } finally {
          // Clean up the object URL
          URL.revokeObjectURL(imageUrl);
        }
        return;
      }

      // Final fallback: download the image
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast(<SuccessToast message="Image downloaded to your device!" />);
    } catch (error) {
      console.error("Error sharing image:", error);

      // Ultimate fallback: copy image URL to clipboard
      try {
        const imageViewUrl = `${window.location.origin}/api/photos/${photo.fileId}/view`;
        await navigator.clipboard.writeText(imageViewUrl);
        toast(<SuccessToast message="Image link copied to clipboard!" />);
      } catch (clipboardError) {
        toast(<ErrorToast message="Sharing failed. Please try again." />);
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
          handleClose();
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

  // Handle browser back button and mobile back swipe
  useEffect(() => {
    // Push a history state immediately when modal opens
    const currentUrl = window.location.href;
    window.history.pushState(
      { modalOpen: true, timestamp: Date.now() },
      "",
      currentUrl
    );

    const handlePopState = (event) => {
      // Close modal when user navigates back
      onClose();
    };

    // Add event listener
    window.addEventListener("popstate", handlePopState);

    return () => {
      // Remove event listener
      window.removeEventListener("popstate", handlePopState);
    };
  }, [onClose]);

  // Handle normal modal close
  const handleClose = () => {
    // Check if we can go back (our state should be in history)
    if (window.history.length > 1) {
      window.history.back();
    } else {
      onClose();
    }
  };

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
          onClick={handleClose}
          className="cursor-pointer text-white hover:text-yellow-400 transition-colors p-2"
          title="Close"
        >
          <FiX size={24} />
        </button>
      </div>
      {/* Main Image */}
      <div className="flex items-center justify-center w-full h-full">
        <img
          src={(() => {
            const imageUrl = `/api/photos/${
              currentPhoto.fileId || "/placeholder.svg"
            }/view`;
            const cachedImg = imageCache.current.get(imageUrl);
            return cachedImg ? cachedImg.src : imageUrl;
          })()}
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
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center z-20 max-w-5xl px-6">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-8 py-5">
          <h2 className="text-2xl font-bold mb-3 text-white drop-shadow-lg">
            {currentPhoto.title}
          </h2>
          <p className="text-xl text-white/90 drop-shadow-lg">
            {currentPhoto.event} | {currentPhoto.uploader}
          </p>
        </div>
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
