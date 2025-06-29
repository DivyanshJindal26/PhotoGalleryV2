"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FiCalendar, FiUser, FiImage, FiType, FiTag } from "react-icons/fi";
import ImageViewer from "./image-viewer";
import { ErrorToast } from "../components/Toast";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";
import "./gallery.css"; // Assuming you have a CSS file for styles

const ITEMS_PER_PAGE = 20;

export default function GalleryWithViewer() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const observerRef = useRef();
  const loadingRef = useRef();

  const [photos, setPhotos] = useState([]);
  const [filteredPhotos, setFilteredPhotos] = useState([]);
  const [displayedPhotos, setDisplayedPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [visibleInfoPhotoId, setVisibleInfoPhotoId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [filters, setFilters] = useState({
    event: queryParams.get("event") || "",
    uploader: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchPhotos();
    checkAdminStatus();
  }, []);

  useEffect(() => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      event: queryParams.get("event") || prevFilters.event,
    }));
  }, [location.search]);

  useEffect(() => {
    applyFilters();
  }, [filters, photos]);

  useEffect(() => {
    setCurrentPage(1);
    setDisplayedPhotos([]);
    setHasMore(true);
    loadMorePhotos(1, filteredPhotos);
  }, [filteredPhotos]);

  const fetchPhotos = async () => {
    try {
      const response = await fetch(`/api/photos?approved=true`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();
      setPhotos(data.files || []);
    } catch (error) {
      toast(<ErrorToast message="Failed to fetch photos" />);
      setPhotos([]);
      setFilteredPhotos([]);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin === true);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    }
  };

  const applyFilters = useCallback(() => {
    setFilteredPhotos(
      photos.filter((photo) => {
        return (
          (!filters.event || photo.event === filters.event) &&
          (!filters.uploader || photo.uploader === filters.uploader) &&
          (!filters.startDate ||
            new Date(photo.uploadedAt) >= new Date(filters.startDate)) &&
          (!filters.endDate ||
            new Date(photo.uploadedAt) <= new Date(filters.endDate))
        );
      })
    );
  }, [filters, photos]);

  const loadMorePhotos = useCallback(
    (page = currentPage, sourcePhotos = filteredPhotos) => {
      if (loading) return;

      setLoading(true);

      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const newPhotos = sourcePhotos.slice(startIndex, endIndex);

      if (newPhotos.length === 0) {
        setHasMore(false);
        setLoading(false);
        return;
      }

      setTimeout(() => {
        if (page === 1) {
          setDisplayedPhotos(newPhotos);
        } else {
          setDisplayedPhotos((prev) => [...prev, ...newPhotos]);
        }

        setCurrentPage(page + 1);
        setHasMore(endIndex < sourcePhotos.length);
        setLoading(false);
      }, 300);
    },
    [currentPage, filteredPhotos, loading]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMorePhotos();
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, loadMorePhotos]);

  const handleLike = async (photoId) => {
    try {
      const response = await fetch(`/api/photos/${photoId}/like`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }

      const data = await response.json();

      setPhotos((prevPhotos) =>
        prevPhotos.map((photo) =>
          photo.fileId === photoId ? { ...photo, likes: data.likes } : photo
        )
      );

      setDisplayedPhotos((prevPhotos) =>
        prevPhotos.map((photo) =>
          photo.fileId === photoId ? { ...photo, likes: data.likes } : photo
        )
      );
    } catch (error) {
      const errorMessage = error.message || "Failed to like photo";
      toast(<ErrorToast message={errorMessage} />);
    }
  };

  const downloadPhoto = async (photo) => {
    try {
      const response = await fetch(`/api/photos/${photo.fileId}/download`, {
        method: "GET",
      });

      if (!response.ok)
        throw new Error(`HTTP error! Status: ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = photo.fileName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast(<ErrorToast message="Failed to download image" />);
    }
  };

  const handleDisapprove = async (photoId) => {
    try {
      const response = await fetch(`/api/approvals/${photoId}/disapprove`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setSelectedPhoto(null);
        fetchPhotos();
      }
    } catch (error) {
      console.error("Error disapproving image:", error);
    }
  };

  const uniqueEvents = [...new Set(photos.map((p) => p.event).filter(Boolean))];
  const uniqueUploaders = [
    ...new Set(photos.map((p) => p.uploader).filter(Boolean)),
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Modern Filter Controls */}
      <div className="filter-tab">
        <select
          name="event"
          value={filters.event}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, event: e.target.value }))
          }
        >
          <option value="">All Events</option>
          {uniqueEvents.map((event) => (
            <option key={event} value={event}>
              {event}
            </option>
          ))}
        </select>

        <select
          name="uploader"
          value={filters.uploader}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, uploader: e.target.value }))
          }
        >
          <option value="">All Uploaders</option>
          {uniqueUploaders.map((uploader) => (
            <option key={uploader} value={uploader}>
              {uploader}
            </option>
          ))}
        </select>

        <input
          type="date"
          name="startDate"
          value={filters.startDate}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, startDate: e.target.value }))
          }
        />
        <input
          type="date"
          name="endDate"
          value={filters.endDate}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, endDate: e.target.value }))
          }
        />
      </div>

      {/* Photo Grid */}
      <div className="photo-grid-container">
        {filteredPhotos.length === 0 ? (
          <div className="no-photos">
            <FiImage className="text-gray-600 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              No photos found
            </h3>
            <p className="text-gray-500">
              Try adjusting your filters to see more photos
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedPhotos.map((photo) => (
                <LazyPhotoCard
                  key={photo.fileId}
                  photo={photo}
                  onPhotoClick={setSelectedPhoto}
                  onLike={handleLike}
                />
              ))}
            </div>

            {/* Loading indicator */}
            <div ref={loadingRef} className="flex justify-center py-12">
              {loading && (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-400">Loading more photos...</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Image Viewer Modal */}
      {selectedPhoto && (
        <ImageViewer
          photos={filteredPhotos}
          selectedPhoto={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onLike={handleLike}
          onDownload={downloadPhoto}
          isAdmin={isAdmin}
          onDisapprove={handleDisapprove}
        />
      )}
    </div>
  );
}

const LazyPhotoCard = ({ photo, onPhotoClick, onLike }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div
      className="group relative bg-white/5 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-yellow-400/20"
      onClick={() => onPhotoClick(photo)}
    >
      <div className="aspect-[5/3] relative overflow-hidden">
        <img
          src={`/api/photos/${photo.fileId}/view`}
          alt={photo.fileName}
          className={`w-full h-full object-cover transition-all duration-500 ${
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-110"
          }`}
          onLoad={() => setIsLoaded(true)}
          loading="lazy"
        />
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/5">
            <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Mobile overlay - only title */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 md:hidden"
        style={{ padding: "1rem 1rem 1rem" }}
      >
        {photo.title && (
          <p className="text-white font-medium text-sm leading-tight">
            {photo.title}
          </p>
        )}
      </div>

      {/* Desktop overlay - full info */}
      <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div
          className="absolute bottom-0 left-0 right-0 p-6"
          style={{ margin: "1rem 1rem 1rem" }}
        >
          <div className="space-y-2">
            {photo.title && (
              <div className="flex items-center gap-2">
                <FiTag className="text-pink-400" size={14} />
                <p className="text-pink-400 font-medium text-sm leading-tight">
                  {photo.title}
                </p>
              </div>
            )}

            {/* <div className="flex items-center gap-2">
              <FiCalendar className="text-gray-300" size={14} />
              <p className="text-gray-300 text-xs">
                {new Date(photo.uploadedAt).toLocaleDateString()}
              </p>
            </div> */}

            <div className="flex items-center gap-2">
              <FiUser className="text-green-400" size={14} />
              <p className="text-green-400 text-xs">
                {photo.uploader || "Unknown"}
              </p>
            </div>

            {photo.event && (
              <div className="flex items-center gap-2">
                <FiImage className="text-purple-400" size={14} />
                <p className="text-purple-400 text-xs">{photo.event}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Like Button - hidden on mobile */}
      <div className="like-container hidden md:block opacity-0 md:group-hover:opacity-100">
        <button
          className="like-button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLike(photo.fileId);
          }}
        >
          ❤️ {photo.likes || 0}
        </button>
      </div>
    </div>
  );
};
