// @ts-nocheck
// Zotero reader 5802d14a; AGPL-3.0-or-later. Type-only integration adapters: Napreth.
import { ReadAloudVoice } from './voice';

export interface ReadAloudProvider {
	readonly standardCreditsRemaining: number | null;
	readonly premiumCreditsRemaining: number | null;
	getVoices(): Promise<ReadAloudVoice[]>;
}
