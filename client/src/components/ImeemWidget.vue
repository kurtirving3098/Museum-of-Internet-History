<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  currentTheme: {
    type: String,
    required: true
  }
});

// Local state to track whether the player window is minimized
const isCollapsed = ref(false);

const themePlaylists = {
  emo: '0Gt1h09nS05v3gBT9xTpnp',      
  gangster: '0dQXzZigsw1SBWnIE9pJGP', 
  teen: '74hL0Jp3kEp5y1IUiPjfa0'      
};

const spotifyEmbedUrl = computed(() => {
  const playlistId = themePlaylists[props.currentTheme];
  if (!playlistId) return null;
  
  // Note: Ensured template literal syntax is correctly resolved via ${playlistId}
  return `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`;
});
</script>

<template>
  <div v-if="spotifyEmbedUrl && currentTheme !== 'default'" class="imeem-player">
    
    <div class="imeem-header" @click="isCollapsed = !isCollapsed" title="Click to collapse/expand">
      <span class="imeem-logo">Imeem Media Player</span>
      <span class="imeem-toggle-icon">
        {{ isCollapsed ? '[ + ]' : '[ − ]' }}
      </span>
    </div>
    
    <div v-show="!isCollapsed" class="imeem-body">
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
      <div class="text-center py-1 bg-black preview-notice">
        * Preview Mode active. Log into Spotify in browser for full tracks.
      </div>
    </div>

  </div>
</template>

<style scoped>
.imeem-player {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 320px;
  background: #111;
  border: 3px solid hotpink; 
  color: white;
  font-family: Verdana, sans-serif; 
  z-index: 9999;
  box-shadow: 0 0 15px hotpink, 0 0 30px purple; 
  border-radius: 4px;
  overflow: hidden;
}

.imeem-header {
  background: linear-gradient(#ff5cc8, #8e44ad); 
  padding: 6px 10px;
  font-weight: bold;
  font-size: 12px;
  letter-spacing: 1px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  cursor: pointer;
}

.imeem-logo {
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
}

.imeem-toggle-icon {
  font-family: monospace;
  font-size: 11px;
  color: #fff;
}

.imeem-track {
  background: #000;
  padding: 2px;
}

.preview-notice {
  font-size: 9px; 
  color: #888;
  border-top: 1px solid #222;
}
</style>