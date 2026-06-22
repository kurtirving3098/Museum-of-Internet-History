<script setup>
const emit = defineEmits(['setTheme']);

const changeTheme = (name) => {
  emit('setTheme', name);
};
</script>

<template>
  <section id="theme-callout" class="sec">
    <div class="container">
      <div class="wrap text-center">
        <h2 class="sec-title">🌟 Step Into the Time Machine 🌟</h2>
        <p class="lead mb-5">
          Experience the web as it looked during the golden age of personal profiles. 
          Switch between iconic design trends that defined online culture throughout the early and mid-2000s.
        </p>
        
        <div class="row justify-content-center g-4">
          
          <div class="col-md-3">
            <div class="theme-preview-box">
              <div class="preview-badge">Default</div>
              <p class="small text-muted mt-3 mb-4">
                Return to the museum's modern layout and contemporary browsing experience.
              </p>
              <button type="button" class="btn w-100" @click="changeTheme('default')">Default</button>
            </div>
          </div>
          
          <div class="col-md-3">
            <div class="theme-preview-box">
              <div class="preview-badge">Emo Theme</div>
              <p class="small text-muted mt-3 mb-4">
                Dark backgrounds, neon accents, song lyrics, and expressive profile customization inspired by the emo and alternative subcultures of the mid-2000s.
              </p>
              <button type="button" class="btn w-100" @click="changeTheme('emo')">Emo</button>
            </div>
          </div>

          <div class="col-md-3">
            <div class="theme-preview-box">
              <div class="preview-badge">Gangster Theme</div>
              <p class="small text-muted mt-3 mb-4">
                Chrome effects, luxury imagery, custom graphics, and bold aesthetics influenced by hip-hop and street culture profile trends of the era.
              </p>
              <button type="button" class="btn w-100" @click="changeTheme('gangster')">Gangster</button>
            </div>
          </div>
          
          <div class="col-md-3">
            <div class="theme-preview-box">
              <div class="preview-badge">Teen Theme</div>
              <p class="small text-muted mt-3 mb-4">
                Bright colors, glitter graphics, celebrity fandoms, and the playful visual style that dominated many teen profiles in the 2000s.
              </p>
              <button type="button" class="btn w-100" @click="changeTheme('teen')">Teen</button>
            </div>
          </div>

        </div>

        <!-- Museum Exhibit Audio Note -->
        <div class="row justify-content-center mt-5">
          <div class="col-md-8">
            <div class="audio-immersion-note p-3">
              <span class="note-icon me-2">🎵</span>
              <strong>Exhibit Audio Note:</strong> Activating a nostalgic era style automatically initializes our custom 
              <strong>imeem Media Player</strong> in the lower section of your viewport. Each configuration features a curated 
              period-accurate playlist designed to deliver a fully immersive, authentic 2000s social profiling experience.
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>
</template>

<style scoped>
.audio-immersion-note {
  font-size: 0.85rem;
  text-align: left;
  transition: all 0.3s ease-in-out;
}
</style>