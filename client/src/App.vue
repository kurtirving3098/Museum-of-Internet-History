<script setup>
  import { RouterLink, RouterView } from 'vue-router';
  import { useGlobalStore } from '@/stores/globalStore';
  import Navbar from './components/Navbar.vue';
  import Footer from './components/Footer.vue';

  const globalStore = useGlobalStore();
</script>

<template>
  <Navbar />
    <main class="app-main">
      <RouterView /> 
    </main>
  <Footer />
</template>

<style scoped>
.app-main {
  /* #nav in main.css is position: fixed with ~2rem vertical padding,
     so it floats out of normal flow. Routed pages need this offset or
     their first element renders underneath the navbar. */
  padding-top: 130px;
}
</style>