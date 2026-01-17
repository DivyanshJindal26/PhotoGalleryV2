import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./PhotoGrid.css";
import tick from "../assets/tick.jpg";
import cross from "../assets/cross.jpg";
import eye from "../assets/eye.jpg";

const PhotoGrid = () => {
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setIsAdmin(data.isAdmin === true);
      } catch (e) {
        // console.error("Error checking admin status:", e);
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin === false) {
      setError("You do not have permission to access this page.");
    }
    if (isAdmin === true) {
      fetchPhotos();
    }
  }, [isAdmin]);

  const fetchPhotos = async () => {
    try {
      const response = await fetch(`/api/approvals`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setPhotos(data);
    } catch (error) {
      // console.error("Error fetching photos:", error);
    }
  };

  const handleApprove = async (fileId) => {
    if (!isAdmin) return;

    try {
      const response = await fetch(`/api/approvals/${fileId}`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      fetchPhotos();
    } catch (error) {
      // console.error("Error approving photo:", error);
    }
  };

  const handleReject = async (fileId) => {
    if (!isAdmin) return;

    try {
      const response = await fetch(`/api/approvals/${fileId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      fetchPhotos();
    } catch (error) {
      // console.error("Error rejecting photo:", error);
    }
  };

  if (isAdmin === null) return <div>Loading...</div>;

  if (!isAdmin) {
    return (
      <div className="error-container">
        <h2>Access Denied</h2>
        <p>{error}</p>
        <button onClick={() => navigate("/")}>Go to Home</button>
      </div>
    );
  }

  return (
    <div className="photo-grid-container">
      <div className="photo-grid">
        {photos.map((photo) => (
          <div key={photo._id} className="photo-card">
            <button
              className="view-button"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img className="icon" src={eye} alt="View" />
            </button>

            <img
              src={`/api/photos/${photo.fileId}/view`}
              alt={photo.fileName}
              className="photo"
              loading="lazy"
            />

            <div className="photo-actions">
              <button
                onClick={() => handleApprove(photo.fileId)}
                disabled={!isAdmin}
              >
                <img className="icon" src={tick} alt="Approve" />
              </button>
              <button
                onClick={() => handleReject(photo.fileId)}
                disabled={!isAdmin}
              >
                <img className="icon" src={cross} alt="Reject" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedPhoto && (
        <div className="modal">
          <div className="modal-content">
            <button
              className="close-button"
              onClick={() => setSelectedPhoto(null)}
            >
              &times;
            </button>
            <img
              src={`/api/photos/${selectedPhoto.fileId}/view`}
              alt={selectedPhoto.fileName}
              className="modal-photo"
            />
            <p>
              <strong>Uploader:</strong> {selectedPhoto.uploader}
            </p>
            <p>
              <strong>Email:</strong> {selectedPhoto.uploaderEmail}
            </p>
            <p>
              <strong>Uploaded on:</strong>{" "}
              {new Date(selectedPhoto.uploadedAt).toLocaleDateString()}
            </p>
            <p className={selectedPhoto.approval ? "approved" : "pending"}>
              {selectedPhoto.approval ? "Approved" : "Pending"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGrid;
