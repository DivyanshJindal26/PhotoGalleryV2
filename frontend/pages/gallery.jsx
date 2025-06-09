"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import "./gallery.css";
import { ErrorToast } from "../components/Toast";
import { toast } from "react-toastify";

const ITEMS_PER_PAGE = 20;

const Gallery = () => {
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
  const [filters, setFilters] = useState({
    event: queryParams.get("event") || "",
    uploader: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchPhotos();
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

  // Reset pagination when filters change
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

  const applyFilters = useCallback(() => {
    const filtered = photos.filter((photo) => {
      return (
        (!filters.event || photo.event === filters.event) &&
        (!filters.uploader || photo.uploader === filters.uploader) &&
        (!filters.startDate ||
          new Date(photo.uploadedAt) >= new Date(filters.startDate)) &&
        (!filters.endDate ||
          new Date(photo.uploadedAt) <= new Date(filters.endDate))
      );
    });
    setFilteredPhotos(filtered);
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

  // Intersection Observer for infinite scroll
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

      if (!response.ok) throw new Error("Failed to update like");

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
      toast(<ErrorToast message="Failed to like the photo" />);
    }
  };

  const downloadPhoto = async (photo) => {
    try {
      const response = await fetch(`/api/photos/${photo.fileId}/download`, {
        method: "GET",
        headers: {},
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

  const uniqueEvents = [...new Set(photos.map((p) => p.event).filter(Boolean))];
  const uniqueUploaders = [
    ...new Set(photos.map((p) => p.uploader).filter(Boolean)),
  ];

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
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
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, []);

  return (
    <>
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

      <div className="photo-grid-container">
        {displayedPhotos.length === 0 && !loading ? (
          <p className="no-photos">No photos found</p>
        ) : (
          <>
            <div className="photo-grid">
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

        {selectedPhoto && (
          <div className="modal" onClick={() => setSelectedPhoto(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="close-button"
                onClick={() => setSelectedPhoto(null)}
              >
                &times;
              </button>

              <div className="modal-photo-container">
                <img
                  src={`/api/photos/${selectedPhoto.fileId}/view`}
                  alt={selectedPhoto.fileName}
                  style={{ cursor: "pointer" }}
                  onClick={() => downloadPhoto(selectedPhoto)}
                />
                <div className="photo-details">
                  <p>
                    <strong>Title:</strong> {selectedPhoto.title}
                  </p>
                  <p>
                    <strong>Event:</strong> {selectedPhoto.event}
                  </p>
                </div>
              </div>

              <button
                className="download-button"
                onClick={() => downloadPhoto(selectedPhoto)}
              >
                ⬇️ Download
              </button>

              <div className="like-container">
                {isAdmin && (
                  <button
                    className="disapprove-button"
                    onClick={async () => {
                      try {
                        const res = await fetch(
                          `/api/approvals/${selectedPhoto.fileId}/disapprove`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                          }
                        );
                        if (res.ok) {
                          setSelectedPhoto(null);
                          window.location.reload();
                        }
                      } catch (error) {
                        toast(
                          <ErrorToast message="Failed to disapprove image" />
                        );
                      }
                    }}
                  >
                    Disapprove
                  </button>
                )}
                <button
                  className="like-button"
                  onClick={() => handleLike(selectedPhoto.fileId)}
                >
                  ❤️ {selectedPhoto.likes || 0}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Lazy loading photo card component
const LazyPhotoCard = ({ photo, onPhotoClick, onLike }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
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

      <div className="photo-info">
        <p className="photo-user">{photo.uploader || "Unknown"}</p>
        <p className="photo-date">
          📅 {new Date(photo.uploadedAt).toLocaleDateString()}
        </p>
        <p className="photo-title">{photo.title}</p>
        <p className="photo-event">{`Event: ${photo.event}`}</p>
      </div>
      <div className="like-container">
        <button className="like-button" onClick={() => onLike(photo.fileId)}>
          ❤️ {photo.likes || 0}
        </button>
      </div>
    </div>
  );
};

export default Gallery;
