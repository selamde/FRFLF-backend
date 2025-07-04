import cv2
import face_recognition
import numpy as np
import os
import threading
import json
import sqlite3
from datetime import datetime
import multiprocessing

CRIMINALS_DIR = 'criminal_faces'
MATCH_DIR = 'matched_faces'
CAMERA_CONFIG = 'cameras.json'
DB_PATH = 'logs.db'
FRAME_SKIP = 5  # Process every 5th frame for performance

# Ensure match_photos directory exists
os.makedirs(MATCH_DIR, exist_ok=True)

def load_criminal_encodings():
    encodings = []
    names = []
    for filename in os.listdir(CRIMINALS_DIR):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            path = os.path.join(CRIMINALS_DIR, filename)
            image = face_recognition.load_image_file(path)
            face_locations = face_recognition.face_locations(image)
            if not face_locations:
                print(f"No face found in {filename}, skipping.")
                continue
            face_encoding = face_recognition.face_encodings(image, face_locations)[0]
            encodings.append(face_encoding)
            names.append(filename)
    return encodings, names

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        criminal_image TEXT,
        camera_name TEXT,
        timestamp TEXT,
        confidence REAL,
        evidence_path TEXT
    )''')
    conn.commit()
    conn.close()

def log_match(criminal_image, camera_name, timestamp, confidence, evidence_path):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''INSERT INTO matches (criminal_image, camera_name, timestamp, confidence, evidence_path)
                 VALUES (?, ?, ?, ?, ?)''',
              (criminal_image, camera_name, timestamp, confidence, evidence_path))
    conn.commit()
    conn.close()

def process_camera(camera_name, camera_url, known_encodings, known_names):
    print(f"[INFO] Starting camera: {camera_name} ({camera_url})")
    cap = cv2.VideoCapture(camera_url)
    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            print(f"[ERROR] Failed to grab frame from {camera_name}")
            break
        frame_count += 1
        if frame_count % FRAME_SKIP != 0:
            continue
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_frame)
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            matches = face_recognition.compare_faces(known_encodings, face_encoding, tolerance=0.5)
            face_distances = face_recognition.face_distance(known_encodings, face_encoding)
            best_match_index = np.argmin(face_distances) if len(face_distances) > 0 else None
            if best_match_index is not None and matches[best_match_index]:
                matched_name = known_names[best_match_index]
                confidence = 1 - face_distances[best_match_index]  # Higher is better
                timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
                matched_folder = os.path.join(MATCH_DIR, os.path.splitext(matched_name)[0])
                os.makedirs(matched_folder, exist_ok=True)
                evidence_filename = f"{os.path.splitext(matched_name)[0]}_{camera_name}_{timestamp}.jpg"
                evidence_path = os.path.join(matched_folder, evidence_filename)
                cv2.imwrite(evidence_path, frame)
                log_match(matched_name, camera_name, timestamp, float(confidence), evidence_path)
                print(f"[MATCH] {matched_name} detected on {camera_name} at {timestamp} (confidence: {confidence:.2f})")
    cap.release()

def main():
    print("[INFO] Loading criminal encodings...")
    known_encodings, known_names = load_criminal_encodings()
    print(f"[INFO] Loaded {len(known_names)} criminal images.")
    print("[INFO] Initializing database...")
    init_db()
    print("[INFO] Loading camera configuration...")
    with open(CAMERA_CONFIG, 'r') as f:
        cameras = json.load(f)
    processes = []
    for cam in cameras:
        p = multiprocessing.Process(target=process_camera, args=(cam['name'], cam['url'], known_encodings, known_names), daemon=True)
        p.start()
        processes.append(p)
    print("[INFO] All camera processes started. Press Ctrl+C to exit.")
    try:
        for p in processes:
            p.join()
    except KeyboardInterrupt:
        print("[INFO] Exiting...")

if __name__ == "__main__":
    main() 