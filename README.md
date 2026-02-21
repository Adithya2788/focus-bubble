<p align="center">
  <img src="./img.png" alt="Project Banner" width="100%">
</p>

# Focus-Bubble 🎯

## Basic Details

### Team Name: Luna

### Team Members
- Member 1: Keerthana Krishnan - Government Engineering College Idukki
- Member 2: Adithya A - Government Engineering College Idukki

### Hosted Project Link
https://adithya2788.github.io/focus-bubble/

### Project Description
Focus Bubble is a cutting-edge, AI-powered study companion designed to transform any environment into a high-productivity zone. Built for the modern student.
At its core, Focus Bubble acts as a "digital guardian." While you study, the application uses your device's sensors—microphone, camera, and light sensors—to monitor your surroundings for common distractions.

### The Problem statement
Modern students face an unprecedented struggle with "deep work." While digital distractions (social media, notifications) are well-documented, environmental friction remains a silent productivity killer. Research shows that cognitive performance drops significantly when background noise exceeds 35–40 dB or when lighting levels fall below 300 lux, leading to premature eye fatigue and reduced information retention.

### The Solution
Focus Bubble solves environmental friction by creating a Real-Time Feedback Loop between the student’s physical space and a digital scoring system.

1. Acoustic Guard (Audio Analysis)
We solve the problem of "invisible noise pollution" by using the Web Audio API.

How it works: The app captures raw audio data through the microphone and converts it into a frequency spectrum. We calculate the Root Mean Square (RMS) to estimate decibel levels.

The Correction: If the ambient noise stays above 35 dB (the threshold where cognitive load increases), the system immediately triggers a visual nudge. This encourages the user to use noise-canceling headphones or find a quieter corner before they get frustrated.

2. Neural Vision (Person Detection)
Interrupted focus is often caused by "visual noise"—people moving in the background or walking into the study area.

How it works: We integrate TensorFlow.js with the COCO-SSD model. This is a pre-trained deep learning model that runs entirely in the browser. It scans webcam frames locally to identify "Person" objects.

The Correction: If the model detects $>1$ person, the Focus Score drops instantly. This creates a psychological "boundary," reminding the student (and those around them) that this is a dedicated deep-work zone.

3. Optical Audit (Luminance Tracking)
Poor lighting is a primary cause of eye strain and drowsiness.

How it works: Since many laptops lack a dedicated lux sensor, we solve this via Canvas Pixel Analysis. We capture a tiny $1 \times 1$ pixel sample of the camera feed and analyze its RGB brightness values.

The Correction: If the calculated brightness is too low (simulating $<300$ lux), the app alerts the user to "Brighten the Space," preventing the physiological slump that comes with studying in the dark.

### Technologies/Components Used
1. Real-Time Vision Engine: TensorFlow.js
2. Acoustic Intelligence: Web Audio API
3. UI Design: Glassmorphism & CSS3
4. Simulated Lighting Audit: Canvas API
5. Persistence & Analytics: Web Storage

**For Software:**
- Languages used: JavaScript
- Libraries used: TensorFlow.js, COCO-SSD, Chart.js
- Tools used: VS Code, Git, GitHub

## Features

List the key features of your project:
- Noise Detection : uses the Web Audio API to measure ambient sound in decibels. Alerts and deducts 10 points if noise exceeds 35dB
- Person Detection : uses TensorFlow.js COCO-SSD to detect how many people are in the camera frame. Alerts and deducts 5 points if more than one person is detected
- Light Level Estimation : analyzes camera frame brightness to approximate lux values. Alerts and deducts 5 points if lighting falls below 300 lux
- Animated Focus Bubble : Central bubble changes color based on score — green (80–100), yellow (40–80), red (0–40)
- Dynamic Focus Scoring : Session starts at 100 points and adjusts in real time based on environmental conditions
Score slowly recovers when the environment improves
- Smart Alerts & Toasts : Contextual toast notifications for each distraction type

## Implementation
Project Structure
The entire app lives in a single focus-bubble.html file, organized into three logical sections — HTML (structure), CSS (styling), and JavaScript (logic). No build tools, no bundler, no server required.

## Project Documentation
1. Project Overview — goals, target users, summary info boxes
2. Key Features — auth, monitoring, scoring table, bubble behavior, analytics
3. Technology Stack — core APIs, CDN libraries, why no backend
4. Software Architecture — SPA structure, page navigation system, data flow diagram, permission pre-warming, cooldown system
5. Data Storage Schema — localStorage structure for users and sessions, analytics calculations
6. Implementation Details — noise algorithm (RMS + dB formula), person detection code, light estimation (ITU luminance formula), session cleanup
7. Setup & Usage Guide — how to run, browser requirements, step-by-step first-time setup, how to fix blocked permissions
8. Known Limitations & Future Improvements — MVP gaps and a roadmap table
9. File Structure — visual tree of the entire single-file architecture

#### Screenshots (Add at least 3)

<p align="center">
  <img src="./Screenshot 2026-02-21 201041.png" alt="first page" width="100%">
</p>

<p align="center">
  <img src="./Screenshot 2026-02-21 201058.png" alt="register page" width="100%">
</p>

<p align="center">
  <img src="./Screenshot 2026-02-21 201225.png" alt="2nd page" width="100%">
</p>

<p align="center">
  <img src="./Screenshot 2026-02-21 201433.png" alt="start page" width="100%">
</p>

<p align="center">
  <img src="./Screenshot 2026-02-21 201532.png" alt="start page" width="100%">
</p>


Made with ❤️ at TinkerHub
