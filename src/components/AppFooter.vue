<template>
  <!-- Links: py-[5px] on the inline links = 25 px tap height (text box is 15 px); padding on an
       inline element doesn't move any text (T-0636). /blog/ with the slash: /blog is a 301. -->
  <footer class="py-4 px-4 text-center text-xs text-text-muted">
    <span>
      Powered by
      <a href="https://dizid.com" target="_blank" rel="noopener" class="py-[5px] text-text-secondary hover:text-text-primary transition-colors">
        Dizid Web Development
      </a>
    </span>
    <span class="mx-2">&middot;</span>
    <a href="/blog/" class="py-[5px] text-text-secondary hover:text-text-primary transition-colors">
      Blog
    </a>
    <span class="mx-2">&middot;</span>
    <a href="/privacy" class="py-[5px] text-text-secondary hover:text-text-primary transition-colors">
      Privacy
    </a>
    <span class="mx-2">&middot;</span>
    <a href="/terms" class="py-[5px] text-text-secondary hover:text-text-primary transition-colors">
      Terms
    </a>
  </footer>
</template>
