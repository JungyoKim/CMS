<script lang="ts">
let { children, class: className } = $props();
</script>

<div class={className}>
{@render children?.()}
</div>
