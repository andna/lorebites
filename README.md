# LoreBites

<p align="center">
  <img src="public/logo.svg" alt="LoreBites Logo" width="200">
</p>

<p align="center">
  <strong>Digest Reddit stories in bite-sized summaries with AI-powered TTS</strong>
</p>

<p align="center">
  <a href="https://lorebites.com" target="_blank">🌐 Available online at lorebites.com</a>
</p>

## Overview

LoreBites transforms lengthy Reddit stories into concise, engaging summaries using AI. Choose between short or bite-sized versions, then listen to them with advanced text-to-speech technology or read at your own pace.

## Features

### AI-Powered Summaries
- **Bite Cut**: Ultra-concise version (80-100 words)
- **Short Cut**: Moderately detailed version (160-190 words)
- **Full Text**: Original Reddit content

### Multiple TTS Engines
- **SynthVoice**: Compatible with all modern browsers
- **Kokoro**: High-quality, natural-sounding WebGPU-powered voice synthesis
- **OpenAI TTS**: Premium quality voices (requires API key)


### Flexible API Integration
- Server-side streaming with SSE (Server-Sent Events)
- Direct browser-to-OpenAI streaming (with your API key)

### Additional Features
- Automatic browser compatibility detection
- Mobile-optimized responsive design
- Cached content for offline reading

## Tech Stack

- **Frontend**: React, CSS
- **Backend**: Node.js, Express
- **AI**: OpenAI GPT models, Kokoro text-to-speech
- **APIs**: OpenAI API, Reddit API
- **Streaming**: Server-Sent Events (SSE)

## Setup

### Prerequisites
- Node.js (v14+)
- npm or yarn
- OpenAI API key (for development)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/lorebites.git
   cd lorebites
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

5. Start the backend server:
   ```bash
   node server.js
   ```

## Usage

1. Browse the available subreddits on the homepage
2. Select a story to read
3. Choose your preferred format (Full, Short, or Bite)
4. Use the TTS player to listen to the content or read it yourself
5. Navigate to other stories using the navigation buttons

## Browser Compatibility

- **Full features** (including Kokoro TTS): Chrome and Edge on desktop with WebGPU support
- **Standard features**: All modern browsers (Firefox, Safari, mobile browsers)


## Acknowledgments

- Reddit for the content API
- OpenAI for the summarization technology
- [Kokoro](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX) for the speech synthesis model

---

<p align="center">
  Made with ☕ and AI
</p>
