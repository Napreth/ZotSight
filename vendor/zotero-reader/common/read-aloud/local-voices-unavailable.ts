// @ts-nocheck
// Zotero reader 5802d14a; AGPL-3.0-or-later. Type-only integration adapters: Napreth.
// TEMP: Local voices make loud pops at the end of every utterance on macOS 27
// without a patch to libmozglue (a64e3671 in zotero/zotero) that would be
// risky to backport, so disable them.

let localVoicesUnavailable = false;

export function setLocalVoicesUnavailable(value: boolean): void {
	localVoicesUnavailable = value;
}

export function areLocalVoicesUnavailable(): boolean {
	return localVoicesUnavailable;
}
