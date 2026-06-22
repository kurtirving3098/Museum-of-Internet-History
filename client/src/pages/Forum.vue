<script setup>
// Forum component logic goes here
</script>

<template>
  <div class="forum-page d-flex align-items-center text-center">
    <div class="container py-5">
      <span class="small tracking-wider fw-bold lbl">ARCHAEOLOGISTS LOUNGE</span>
      <h1 class="display-5 fw-normal mt-2 text-white sec-title">Under <em>Construction</em></h1>
      <p class="sub mx-auto mt-3" style="max-width: 550px;">
        This dig site isn't open yet. The forum where fellow internet archaeologists
        trade finds and theories is still being excavated — check back soon.
      </p>
      <router-link to="/" class="btn btn-outline px-4 py-2 mt-4 d-inline-block">Back to the Museum</router-link>
    </div>
  </div>
</template>

<style scoped>
.forum-page {
  min-height: calc(100vh - 130px);
}
</style>