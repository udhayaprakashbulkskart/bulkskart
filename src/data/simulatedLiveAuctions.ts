/**
 * Simulated auctions were removed. The marketplace shows only auctions that exist in the database.
 * These stubs keep the old call sites working until they are cleaned up.
 */

export const SIMULATED_AUCTIONS_ENABLED = false;

export const SIMULATED_ID_PREFIX = 'sim-auc-';

export interface SimulatedAuctionItem {
  id: string;
  auction_number: string;
  auction_type: 'reverse' | 'forward';
  title: string;
  description: string;
  total_quantity: number;
  moq: number;
  quantity_unit: string;
  starting_price: number;
  reserve_price?: number;
  current_highest_bid: number | null;
  min_bid_increment: number;
  total_bids: number;
  highest_bidder_name?: string;
  end_time: string;
  status: string;
  delivery_location: string;
  images?: string[];
  manufacturer_name?: string;
  is_simulated?: true;
}

export function simulatedRemainingSeconds(): number {
  return 0;
}

export function isSimulatedAuctionId(_id?: string | null): boolean {
  return false;
}

export function getSimulatedAuctions(): SimulatedAuctionItem[] {
  return [];
}

export function getSimulatedAuctionById(_id: string): SimulatedAuctionItem | null {
  return null;
}

export function getSimulatedBidHistory(
  _auction: SimulatedAuctionItem,
): Array<{
  id: string;
  bidder_name: string;
  bid_amount: number;
  quantity: number;
  timestamp: string;
  status: 'accepted' | 'outbid' | 'winning';
}> {
  return [];
}

export function mergeWithSimulatedAuctions<T extends { id: string; auction_type?: string }>(
  dbAuctions: T[],
): Array<T | SimulatedAuctionItem> {
  return dbAuctions;
}
