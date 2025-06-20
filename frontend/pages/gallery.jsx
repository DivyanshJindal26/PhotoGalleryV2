"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FiInfo } from "react-icons/fi";
import ImageViewer from "./image-viewer";
import "./gallery.css";
import { ErrorToast } from "../components/Toast";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";

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
      // console.error("Error fetching photos:", error);
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
      }, 300); // Small delay to show loading state
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

      // Update both photos and displayedPhotos
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
      // console.error("Error downloading image:", error);
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
        fetchPhotos(); // Refresh the photos
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
    <div className="min-h-screen bg-black text-yellow-400">
      {/* Filter Controls */}
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
          <div className="no-photos">No photos found</div>
        ) : (
          <>
            <div className="photo-grid">
              {" "}
              {displayedPhotos.map((photo) => (
                <LazyPhotoCard
                  key={photo.fileId}
                  photo={photo}
                  onPhotoClick={setSelectedPhoto}
                  onLike={handleLike}
                />
              ))}
            </div>

            {/* Loading indicator and infinite scroll trigger */}

            <div ref={loadingRef} className="loading-container">
              {loading && (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  <p>Loading more photos...</p>
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
  const [isInView, setIsInView] = useState(false);
  const [isInfoVisible, setIsInfoVisible] = useState(null);
  const imgRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className="photo-card">
      {isInView && (
        <>
          <img
            src={`/api/photos/${photo.fileId}/view`}
            alt={photo.fileName}
            className={`photo small-photo ${isLoaded ? "loaded" : "loading"}`}
            onClick={() => onPhotoClick(photo)}
            onLoad={() => setIsLoaded(true)}
            loading="lazy"
          />
          {!isLoaded && <div className="image-placeholder">...</div>}
        </>
      )}

      {/* Info Button */}
      <button
        className="absolute top-2 left-2 bg-white/60 text-black p-2.5 rounded-full hover:bg-white transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setIsInfoVisible(isInfoVisible ? null : photo.fileId);
        }}
      >
        <FiInfo size={20} />
      </button>

      {/* Info Overlay */}
      {isInfoVisible && (
        <div className="photo-info">
          <p className="photo-user">{photo.uploader || "Unknown"}</p>
          <p className="photo-date">
            📅 {new Date(photo.uploadedAt).toLocaleDateString()}
          </p>
          <p className="photo-title">{photo.title}</p>
          <p className="photo-event">{`Event: ${photo.event}`}</p>
        </div>
      )}

      {/* Like Button */}
      <div className="like-container">
        <button
          className="like-button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleLike(photo.fileId);
          }}
        >
          ❤️ {photo.likes || 0}
        </button>
      </div>
    </div>
  );
};
