import React, { useEffect, useRef } from 'react';

function VideoFeed({ apiUrl, monitoring }) {
  const imageRef = useRef(null);

  useEffect(() => {
    const updateFrame = () => {
      if (monitoring && imageRef.current) {
        // Update the image source timestamp to force refresh
        const timestamp = new Date().getTime();
        imageRef.current.src = `${apiUrl}/video-stream?t=${timestamp}`;
      }
    };

    // Try MJPEG stream first
    if (monitoring) {
      const img = new Image();
      img.src = `${apiUrl}/video-stream`;
      img.onload = () => {
        if (imageRef.current) {
          imageRef.current.src = img.src;
        }
      };
      img.onerror = () => {
        console.log('MJPEG stream not available, using fallback');
      };
    }

    const interval = setInterval(updateFrame, 33); // ~30 FPS

    return () => clearInterval(interval);
  }, [monitoring, apiUrl]);

  return (
    <div className="video-feed">
      {monitoring ? (
        <img
          ref={imageRef}
          src={`${apiUrl}/video-stream`}
          alt="Student Video Feed"
          className="video-stream"
        />
      ) : (
        <div className="video-placeholder">
          <p>📹 Video Feed Inactive</p>
          <span>Click "Start Monitoring" to begin</span>
        </div>
      )}
    </div>
  );
}

export default VideoFeed;
