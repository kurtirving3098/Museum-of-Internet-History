<script setup>
import { computed } from 'vue';

const props = defineProps({
  currentTheme: {
    type: String,
    required: true
  }
});

// Map Spotify Playlist IDs to your themes
const themePlaylists = {
  emo: '37i9dQZF1DX9wa6XirBPv8',      // Spotify 'Emo Forever' playlist
  gangster: '37i9dQZF1DX186v583rmzp', // Spotify '90s/00s Hip Hop' playlist
  teen: '37i9dQZF1DWWvvyNmW9V9a'      // Spotify '00s Pop' playlist
};

// Compute the correct iframe URL dynamically
const spotifyEmbedUrl = computed(() => {
  const playlistId = themePlaylists[props.currentTheme];
  if (!playlistId) return null;
  // Using theme=0 forces the dark player which looks better in the Imeem wrapper
  return `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`;
});
</script>

<template>
  <!-- Only show the widget if a nostalgic theme is active and we have a playlist -->
  <div v-if="spotifyEmbedUrl && currentTheme !== 'default'" class="imeem-player">
    <div class="imeem-header">
      <span>imeem</span>
    </div>
    <div class="imeem-track">
      <iframe 
        :src="spotifyEmbedUrl" 
        width="100%" 
        height="80" 
        frameBorder="0" 
        allowfullscreen="" 
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
        loading="lazy">
      </iframe>
    </div>
  </div>
</template>

<style scoped>
/* Adapted from your emo.css base[cite: 4] */
.imeem-player {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 320px;
  background: #111;
  border: 3px solid hotpink; /*[cite: 4] */
  color: white;
  font-family: Verdana, sans-serif; /*[cite: 4] */
  z-index: 9999;
  box-shadow: 0 0 15px hotpink, 0 0 30px purple; /*[cite: 4] */
  border-radius: 4px;
  overflow: hidden;
}

.imeem-header {
  background: linear-gradient(#ff5cc8, #8e44ad); /*[cite: 4] */
  padding: 4px 8px;
  font-weight: bold; /*[cite: 4] */
  font-size: 14px;
  text-shadow: 1px 1px 0px rgba(0,0,0,0.5);
  display: flex;
  justify-content: space-between;
}

.imeem-track {
  padding: 4px; /*[cite: 4] */
  background: #000;
}

/* Optional: Make it change colors based on the theme globally */
:global(body[data-theme="gangster"]) .imeem-player {
  border-color: #ffd700;
  box-shadow: 0 0 15px #ffd700, 0 0 30px #00ff66;
}
:global(body[data-theme="gangster"]) .imeem-header {
  background: linear-gradient(#444, #111);
  color: #ffd700;
}
</style>