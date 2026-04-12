<script>
  import { onMount }      from 'svelte'
  import { authApi }      from '../../api/auth.js'
  import SessionExpired   from './SessionExpired.svelte'

  // 'checking' | 'valid' | 'invalid'
  let state = 'checking'

  onMount(async () => {
    try {
      await authApi.me()
      state = 'valid'
    } catch {
      state = 'invalid'
    }
  })
</script>

{#if state === 'valid'}
  <slot />
{:else if state === 'invalid'}
  <SessionExpired />
{:else}
  <div class="guard-loading" role="status">Vérification de la session…</div>
{/if}

<style>
  .guard-loading {
    min-height: 40vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 2px;
    font-size: 13px;
  }
</style>
