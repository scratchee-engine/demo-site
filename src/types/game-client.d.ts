declare module '@scratchee/game-client' {
  import type { SvelteComponent } from 'svelte';
  export default class GameClient extends SvelteComponent<{
    serial?: string;
    cardData?: any;
    assetPack?: any;
    onReveal?: () => Promise<any>;
    onComplete?: (result: { won: boolean; prizeAmountCents?: number; prizeTierName?: string | null }) => void;
  }> {}
}
