export type ScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export type PcTier = 1 | 2 | 3 | 4;

export type RoomId =
  | 'starter'
  | 'backroom'
  | 'esports_wing'
  | 'vip_lounge'
  | 'empire_hall'
  | 'second_floor';

export type ItemCategory =
  | 'stations'
  | 'computers'
  | 'furniture'
  | 'utilities'
  | 'decor';

export type CatalogItemType =
  | 'station_tier1'
  | 'station_tier2'
  | 'station_tier3'
  | 'station_tier4'
  | 'pc_tier1'
  | 'pc_tier2'
  | 'pc_tier3'
  | 'pc_tier4'
  | 'basic_desk'
  | 'gaming_desk'
  | 'esports_desk'
  | 'vip_desk'
  | 'plastic_stool'
  | 'office_chair'
  | 'gaming_chair'
  | 'esports_chair_pro'
  | 'cashier_counter'
  | 'ac_unit'
  | 'router'
  | 'printer'
  | 'snack_rack'
  | 'drink_fridge'
  | 'coffee_station'
  | 'cctv_camera'
  | 'trash_bin'
  | 'waiting_bench'
  | 'plant'
  | 'neon_poster'
  | 'wall_neon_sign'
  | 'rgb_lamp';

export interface PcSpecs {
  tier: PcTier;
  name: string;
  cpuName: string;
  cpuPerf: number; // 1-100
  gpuName: string;
  gpuPerf: number; // 1-100
  ramGb: number;
  monitorQuality: number; // 1-100
  powerWatts: number;
  dailyMaintenance: number;
  hourlyRate: number;
  cost: number;
}

export interface CatalogItemDef {
  id: CatalogItemType;
  name: string;
  category: ItemCategory;
  cost: number;
  roleClue: string;
  width: number;
  depth: number;
  blocksWalk: boolean;
  isDesk?: boolean;
  isChair?: boolean;
  pcTier?: PcTier;
  deskStyle?: 'basic' | 'gaming' | 'esports' | 'vip';
  chairStyle?: 'plastic' | 'office' | 'gaming' | 'pro';
  coolingBonus?: number;
  wifiBonus?: number;
  decorBonus?: number;
}

export interface PlacedComputer {
  id: string;
  tier: PcTier;
  condition: number; // 0 to 100
  occupiedByCustomerId: string | null;
  beingRepairedByStaffId: string | null;
  totalHoursUsed: number;
  totalRevenue: number;
  isBroken: boolean;
}

export interface PlacedObject {
  id: string;
  type: CatalogItemType;
  x: number; // grid x
  z: number; // grid z
  rotation: 0 | 1 | 2 | 3; // 0, 90, 180, 270 deg
  computer?: PlacedComputer;
  hasChair?: boolean;
  chairStyle?: 'plastic' | 'office' | 'gaming' | 'pro';
}

export type CustomerArchetype =
  | 'casual'
  | 'student'
  | 'office'
  | 'hardcore'
  | 'competitive';

export type CustomerBehaviorState =
  | 'entering'
  | 'walking_to_pc'
  | 'sitting_playing'
  | 'walking_to_cashier'
  | 'paying'
  | 'leaving';

export type CustomerActivity =
  | 'typing'
  | 'mouse'
  | 'drinking'
  | 'idle'
  | 'chatting';

export interface GridPoint {
  x: number;
  z: number;
}

export interface CustomerEntity {
  id: string;
  name: string;
  archetype: CustomerArchetype;
  state: CustomerBehaviorState;
  x: number; // continuous world tile coord
  z: number;
  facing: number; // radians
  path: GridPoint[];
  targetObjectId: string | null;
  budget: number;
  minPcTier: PcTier;
  patience: number; // 0-100
  satisfaction: number; // 0-100
  sessionDurationHours: number; // planned hours
  sessionElapsedHours: number;
  wantsPrinting: boolean;
  wantsSnack: boolean;
  wantsDrink: boolean;
  wantsMembership: boolean;
  billDue: number;
  payTimer: number;
  shirtColor: number;
  pantsColor: number;
  hairColor: number;
  skinColor: number;
  walkDistance: number;
  activity?: CustomerActivity;
  activityTimer?: number;
  queueIndex?: number;
  isRegular?: boolean;
}

export type StaffRole = 'cashier' | 'technician' | 'cleaner' | 'security';

export type StaffState = 'idle' | 'working' | 'walking';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  salary: number; // daily salary in Rp
  skillLevel: number; // 1-5
  productivity: number; // 0.5-2.0
  experience: number; // 0-100+
  x: number;
  z: number;
  facing: number;
  path: GridPoint[];
  state: StaffState;
  targetObjectId: string | null;
  walkDistance: number;
}

export type InternetPlanId = 'adsl_1m' | 'broadband_10m' | 'fiber_50m' | 'fiber_200m' | 'dedicated_1g';
export type LightingTierId = 'fluorescent' | 'warm_cafe' | 'rgb_gaming' | 'esports_arena';

export interface BranchLocation {
  id: string;
  name: string;
  city: string;
  openCost: number;
  dailyProfit: number;
  level: number;
  opened: boolean;
}

export type RandomEventId =
  | 'internet_outage'
  | 'power_outage'
  | 'broken_pc'
  | 'busy_weekend'
  | 'school_holiday'
  | 'local_tournament'
  | 'equipment_discount'
  | 'unexpected_maintenance'
  | 'rival_price_war'
  | 'viral_streamer'
  | 'monsoon_rush'
  | 'snack_boom';

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  cost: number;
  reputationDelta: number;
  effectType:
    | 'fix_outage_now'
    | 'wait_outage'
    | 'rent_genset'
    | 'close_briefly'
    | 'repair_all'
    | 'ignore_repair'
    | 'host_tournament'
    | 'standard_ops'
    | 'buy_bulk_discount'
    | 'pay_maintenance'
    | 'promo_counter'
    | 'streamer_collab'
    | 'rain_cozy'
    | 'snack_bundle';
}

export interface ActiveRandomEvent {
  id: RandomEventId;
  title: string;
  description: string;
  triggeredDay: number;
  choices: EventChoice[];
}

export interface TemporaryEffects {
  internetOutageHours: number;
  powerOutageHours: number;
  demandMultiplier: number;
  demandBoostHours: number;
  equipmentDiscountPct: number;
  discountHours: number;
  tournamentActiveHours: number;
}

export type WeatherType = 'sunny' | 'overcast' | 'rain';

export interface CustomerReview {
  id: string;
  author: string;
  rating: number; // 1..5
  comment: string;
  day: number;
  archetype: CustomerArchetype;
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  kind: 'serve_customers' | 'earn_revenue' | 'keep_clean' | 'upgrade_or_repair';
  target: number;
  progress: number;
  rewardCash: number;
  rewardRep: number;
  claimed: boolean;
}

export interface CompetitorWarnet {
  id: string;
  name: string;
  district: string;
  reputation: number;
  hourlyPrice: number;
  pcCount: number;
  marketSharePct: number;
  promoActive: boolean;
}

export interface CctvIncident {
  id: string;
  day: number;
  time: string;
  message: string;
  prevented: boolean;
}

export interface RevenueBreakdown {
  pcRental: number;
  printing: number;
  snacks: number;
  drinks: number;
  memberships: number;
  tournaments: number;
  branches: number;
}

export interface ExpenseBreakdown {
  electricity: number;
  internet: number;
  rent: number;
  salaries: number;
  maintenance: number;
  equipment: number;
  events: number;
}

export interface DailyReport {
  day: number;
  revenue: RevenueBreakdown;
  expenses: ExpenseBreakdown;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  customersServed: number;
  endingBalance: number;
  reputation: number;
}

export type ProgressionStageId = 1 | 2 | 3 | 4 | 5;

export interface ProgressionStageDef {
  id: ProgressionStageId;
  title: string;
  subtitle: string;
  requiredPcs: number;
  requiredReputation: number;
  requiredEmployees: number;
  requiredRoom?: RoomId;
  rewardCash: number;
}

export interface SimulationState {
  day: number;
  minuteOfDay: number; // 0..1440 (starts at 480 = 08:00)
  balance: number; // Rp
  reputation: number; // 0..5.0
  cleanliness: number; // 0..100
  stage: ProgressionStageId;
  unlockedRooms: RoomId[];
  internetPlan: InternetPlanId;
  lightingTier: LightingTierId;
  hourlyRateMultiplier: number; // 0.7..1.5
  membershipPrice: number;
  objects: PlacedObject[];
  customers: CustomerEntity[];
  staff: StaffMember[];
  branches: BranchLocation[];
  todayRevenue: RevenueBreakdown;
  todayExpenses: ExpenseBreakdown;
  todayCustomersServed: number;
  totalCustomersServed: number;
  customerArchetypeCounts: Record<CustomerArchetype, number>;
  dailyHistory: DailyReport[];
  pendingEvent: ActiveRandomEvent | null;
  effects: TemporaryEffects;
  lastEventDay: number;
  spawnAccumulator: number;
  nextEntityId: number;
  gameWon: boolean;
  gameOverReason: string | null;
  recentNotifications: Array<{ id: string; text: string; tone: 'good' | 'warn' | 'bad' }>;
  weather: WeatherType;
  weatherHoursLeft: number;
  dailyQuests: DailyQuest[];
  reviews: CustomerReview[];
  loyaltyCustomersCount: number;
  competitors: CompetitorWarnet[];
  cctvLog: CctvIncident[];
  snackUnitsSold: number;
  drinkUnitsSold: number;
  questsCompletedCount: number;
}

export interface SaveSlotMeta {
  slotId: string;
  label: string;
  savedAt: number;
  day: number;
  balance: number;
  stage: ProgressionStageId;
  pcCount: number;
  reputation: number;
}

export interface SaveRecord {
  meta: SaveSlotMeta;
  state: SimulationState;
  dayDurationSeconds: number;
}
