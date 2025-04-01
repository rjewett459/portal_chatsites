// == Chatty Embed Script with OpenAI Realtime API (Voice-to-Voice) ==
(function() {
  const BUTTON_COLOR = '#F65228';

  // Create Chatty Button
  const chattyBtn = document.createElement('div');
  chattyBtn.id = 'chatty-btn';
  chattyBtn.style.position = 'fixed';
  chattyBtn.style.bottom = '20px';
  chattyBtn.style.right = '20px';
  chattyBtn.style.width = '60px';
  chattyBtn.style.height = '60px';
  chattyBtn.style.backgroundColor = BUTTON_COLOR;
  chattyBtn.style.borderRadius = '50%';
  chattyBtn.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
  chattyBtn.style.zIndex = '9999';
  chattyBtn.style.cursor = 'pointer';
  chattyBtn.style.transition = 'transform 0.2s';

  chattyBtn.addEventListener('mouseover', () => chattyBtn.style.transform = 'scale(1.1)');
  chattyBtn.addEventListener('mouseout', () => chattyBtn.style.transform = 'scale(1)');

  // Create Chatty Portal
  const portal = document.createElement('div');
  portal.id = 'chatty-portal';
  portal.style.position = 'fixed';
  portal.style.bottom = '90px';
  portal.style.right = '20px';
  portal.style.width = '375px';
  portal.style.height = '667px';
  portal.style.backgroundColor = 'black';
  portal.style.borderRadius = '20px';
  portal.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
  portal.style.zIndex = '9999';
  portal.style.display = 'none';
  portal.style.overflow = 'hidden';
  portal.style.padding = '20px';
  portal.style.color = 'white';
  portal.style.fontFamily = 'sans-serif';

  // Pulsating Orb
  const orb = document.createElement('div');
  orb.style.width = '80px';
  orb.style.height = '80px';
  orb.style.borderRadius = '50%';
  orb.style.backgroundColor = BUTTON_COLOR;
  orb.style.margin = 'auto';
  orb.style.marginTop = '50%';
  orb.style.animation = 'pulse 1.5s infinite';
  orb.style.cursor = 'pointer';
  portal.appendChild(orb);

  // Transcript Output
  const transcriptBox = document.createElement('div');
  transcriptBox.id = 'transcript';
  transcriptBox.style.marginTop = '20px';
  transcriptBox.style.maxHeight = '200px';
  transcriptBox.style.overflowY = 'auto';
  portal.appendChild(transcriptBox);

  // Pulsing Animation Style
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(1); opacity: 0.8; }
    }
  `;
  document.head.appendChild(style);

  // Toggle Portal Visibility
  chattyBtn.onclick = () => {
    portal.style.display = (portal.style.display === 'none') ? 'block' : 'none';
  };

  // Append elements
  document.body.appendChild(chattyBtn);
  document.body.appendChild(portal);

  // === Microphone Streaming + WebSocket to OpenAI Realtime API ===
  let mediaRecorder;
  let audioChunks = [];
  let socket;

  const connectToOpenAIRealtimeAPI = () => {
    socket = new WebSocket('wss://chatty-realtime-api.onrender.com'); // ✅ Replace with your actual Render subdomain if different

    socket.onopen = () => {
      console.log('Connected to OpenAI Realtime API');
      socket.send(JSON.stringify({ type: 'start_session', user: 'chatty-widget' }));
      startMicrophoneStream();
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.transcript) {
        const p = document.createElement('p');
        p.textContent = '👂 ' + data.transcript;
        transcriptBox.appendChild(p);
        transcriptBox.scrollTop = transcriptBox.scrollHeight;
      }
      if (data.audio) {
        const audio = new Audio('data:audio/mp3;base64,' + data.audio);
        audio.play();
      }
    };

    socket.onerror = (error) => console.error('Socket error:', error);
    socket.onclose = () => console.log('Disconnected from API');
  };

  const startMicrophoneStream = () => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start(250); // Send chunks every 250ms

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0 && socket && socket.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result.split(',')[1];
            socket.send(JSON.stringify({ type: 'audio_chunk', audio: base64data }));
          };
          reader.readAsDataURL(e.data);
        }
      };
    }).catch(err => {
      console.error('Microphone error:', err);
    });
  };

  orb.onclick = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      connectToOpenAIRealtimeAPI();
    } else {
      socket.close();
    }
  };
})();
