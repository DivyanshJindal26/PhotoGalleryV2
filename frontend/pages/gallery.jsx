"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "./gallery.css";
import { ErrorToast } from "../components/Toast";
import { toast } from "react-toastify";

const Gallery = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const [photos, setPhotos] = useState([]);
  const [filteredPhotos, setFilteredPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
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

  // Fixed handleLike function that updates state directly without refetching
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

      // Update photos state without refetching
      setPhotos((prevPhotos) =>
        prevPhotos.map((photo) =>
          photo.fileId === photoId ? { ...photo, likes: data.likes } : photo
        )
      );

      // Also update filteredPhotos to ensure UI consistency
      setFilteredPhotos((prevPhotos) =>
        prevPhotos.map((photo) =>
          photo.fileId === photoId ? { ...photo, likes: data.likes } : photo
        )
      );

      // Update selectedPhoto if it's the one being liked
      if (selectedPhoto && selectedPhoto.fileId === photoId) {
        setSelectedPhoto((prev) => ({ ...prev, likes: data.likes }));
      }
    } catch (error) {
      toast(<ErrorToast message="Failed to like the photo" />);
      // console.error("Error liking the photo:", error);
    }
  };

  const downloadPhoto = async (photo) => {
    try {
      const response = await fetch(`/api/photos/${photo.fileId}/download`, {
        method: "GET",
        headers: {
          // "X-API-KEY": <your-api-key-if-needed>,
        },
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
          credentials: "include", // ensures cookies are sent
        });

        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin === true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        // console.error("Error checking admin status:", error);
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
        {filteredPhotos.length === 0 ? (
          <p className="no-photos">No photos found</p>
        ) : (
          <div className="photo-grid">
            {filteredPhotos.map((photo) => (
              <div key={photo.fileId} className="photo-card">
                {/* Use view endpoint to stream image */}
                <img
                  src={`/api/photos/${photo.fileId}/view`}
                  alt={photo.fileName}
                  className="photo small-photo"
                  onClick={() => setSelectedPhoto(photo)}
                />
                <div className="photo-info">
                  <p className="photo-user">{photo.uploader || "Unknown"}</p>
                  <p className="photo-date">
                    📅 {new Date(photo.uploadedAt).toLocaleDateString()}
                  </p>
                  <p className="photo-title">{photo.title}</p>
                  <p className="photo-event">{`Event: ${photo.event}`}</p>
                </div>
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
            ))}
          </div>
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
                {/* Admin disapprove button if user is admin */}
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
                        // console.error("Error disapproving image:", error);
                      }
                    }}
                  >
                    Disapprove
                  </button>
                )}
                <button
                  className="like-button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLike(selectedPhoto.fileId);
                  }}
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

export default Gallery;
