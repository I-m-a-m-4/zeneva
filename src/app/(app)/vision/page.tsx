'use client';

import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Video, 
  Camera, 
  Activity, 
  Shield, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  UserCheck,
  Footprints,
  Percent,
  Coins,
  Clock, 
  Maximize2, 
  Settings2, 
  Plus, 
  Play, 
  Pause, 
  RotateCcw, 
  Gauge, 
  Cpu, 
  HardDrive, 
  Radio, 
  TrendingUp, 
  Sliders, 
  Eye, 
  EyeOff, 
  Smartphone, 
  ShoppingBag, 
  CreditCard, 
  Sparkles,
  Info,
  Server,
  ArrowUpRight,
  Filter,
  Check
} from 'lucide-react';
import PageTitle from '@/components/shared/page-title';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CameraStream {
  id: string;
  name: string;
  location: string;
  sourceType: 'rtsp' | 'onvif' | 'webcam' | 'simulated';
  url: string;
  fps: number;
  status: 'online' | 'optimizing' | 'offline';
  dwellAlerts: number;
  peopleCount: number;
  leanFiltering: number; // percentage of frames dropped
  sceneImage: string;
  videoUrl?: string;
}

interface VisionEvent {
  id: string;
  timestamp: string;
  cameraId: string;
  cameraName: string;
  type: 'traffic' | 'dwell' | 'queue' | 'loss_prevention' | 'pos_sync';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  posReceiptId?: string;
  details?: string;
}

const INITIAL_CAMERAS: CameraStream[] = [
  {
    id: 'cam-1',
    name: 'Checkout Desk 1 & Cash Till',
    location: 'Register 1 (Primary Point of Sale)',
    sourceType: 'onvif',
    url: 'rtsp://admin:***@192.168.1.102:554/live/0',
    fps: 25,
    status: 'online',
    dwellAlerts: 1,
    peopleCount: 3,
    leanFiltering: 96.1,
    sceneImage: '/images/zen-cam/retail-theft-ai.jpg',
    videoUrl: '/High-angle%2045-degree%20surveillance%20camera%20shot.mp4',
  },
  {
    id: 'cam-2',
    name: 'Aisle 3: High-Value Cosmetics',
    location: 'Center Merchandise Display',
    sourceType: 'rtsp',
    url: 'rtsp://admin:***@192.168.1.103:554/stream1',
    fps: 20,
    status: 'online',
    dwellAlerts: 3,
    peopleCount: 2,
    leanFiltering: 93.8,
    sceneImage: '/images/zen-cam/aisle-theft-ai.jpg',
    videoUrl: '/CCTV%20surveillance%20perspective%20of%20a%20luxury%20cosmetics.mp4',
  },
  {
    id: 'cam-3',
    name: 'Front Entrance & Street View',
    location: 'Main Entry / Foyer',
    sourceType: 'rtsp',
    url: 'rtsp://admin:***@192.168.1.101:554/ch1/main',
    fps: 24,
    status: 'online',
    dwellAlerts: 0,
    peopleCount: 4,
    leanFiltering: 94.2,
    sceneImage: '/images/zen-cam/zen-retail-scene.jpg',
    videoUrl: '/Cinematic%20high-angle%20CCTV%20camera%20perspective.mp4',
  },
  {
    id: 'cam-4',
    name: 'Stockroom & Receiving Door',
    location: 'Rear Warehouse Bay',
    sourceType: 'rtsp',
    url: 'rtsp://admin:***@192.168.1.104:554/h264',
    fps: 15,
    status: 'online',
    dwellAlerts: 0,
    peopleCount: 1,
    leanFiltering: 97.4,
    sceneImage: '/images/zen-cam/zen-retail-scene.jpg',
    videoUrl: '/Cinematic%20close-up%20macro%20sequence%20of%20a%20white%20security.mp4',
  }
];

const INITIAL_EVENTS: VisionEvent[] = [
  {
    id: 'evt-1',
    timestamp: 'Just now',
    cameraId: 'cam-1',
    cameraName: 'Checkout Desk 1',
    type: 'pos_sync',
    title: 'POS Scan Verified',
    description: 'Basket of 3 items matched with Ticket #rec-7419 (₦16,500). Cash drawer closed.',
    severity: 'low',
    posReceiptId: 'rec-7419',
  },
  {
    id: 'evt-2',
    timestamp: '2 mins ago',
    cameraId: 'cam-2',
    cameraName: 'Aisle 3: Cosmetics',
    type: 'dwell',
    title: 'High-Value Display Dwell (68s)',
    description: 'Shopper lingered > 60s at luxury fragrance display. Automated staff nudge triggered.',
    severity: 'medium',
  },
  {
    id: 'evt-3',
    timestamp: '5 mins ago',
    cameraId: 'cam-1',
    cameraName: 'Checkout Desk 1',
    type: 'loss_prevention',
    title: 'Cash Drawer Opened Without Sale',
    description: 'Audit flag: Register 1 till opened manually without active sale. Staff profile: AMINA.',
    severity: 'high',
  },
  {
    id: 'evt-4',
    timestamp: '9 mins ago',
    cameraId: 'cam-3',
    cameraName: 'Front Entrance',
    type: 'traffic',
    title: 'Store Foot-Traffic Surge',
    description: '14 customers entered in 10-minute window. Current store occupancy: 19 shoppers.',
    severity: 'low',
  },
  {
    id: 'evt-5',
    timestamp: '14 mins ago',
    cameraId: 'cam-1',
    cameraName: 'Checkout Desk 1',
    type: 'queue',
    title: 'Queue Depth Alert',
    description: 'Checkout line exceeded 3 shoppers. Prompt sent to open secondary till register.',
    severity: 'medium',
  }
];

export default function ZenVisionConsolePage() {
  const { toast } = useToast();
  const [cameras, setCameras] = useState<CameraStream[]>(INITIAL_CAMERAS);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('cam-1');
  const [events, setEvents] = useState<VisionEvent[]>(INITIAL_EVENTS);
  const [filterType, setFilterType] = useState<string>('all');
  
  // Real-time stream optimizer metrics (Screenpipe inspired)
  const [totalFramesIngested, setTotalFramesIngested] = useState(142800);
  const [framesFilteredOut, setFramesFilteredOut] = useState(135400);
  const [leanFilterRate, setLeanFilterRate] = useState(94.8);
  const [activeOccupancy, setActiveOccupancy] = useState(19);
  const [dailyVisitors, setDailyVisitors] = useState(248);
  const [conversionRate, setConversionRate] = useState(67.4);

  // Overlays
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [showDwellHeatmap, setShowDwellHeatmap] = useState(true);
  const [showLeanMeter, setShowLeanMeter] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Webcam integration
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);

  // Add camera modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCamName, setNewCamName] = useState('');
  const [newCamUrl, setNewCamUrl] = useState('');

  // Ticking simulation for Screenpipe-style lean filtering
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setTotalFramesIngested(prev => prev + 24);
      setFramesFilteredOut(prev => prev + 23);
      setLeanFilterRate(prev => {
        const jitter = (Math.random() - 0.5) * 0.2;
        return Number(Math.min(97.8, Math.max(93.1, prev + jitter)).toFixed(1));
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Handle Webcam toggle
  const toggleWebcam = async () => {
    if (isWebcamActive) {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
        webcamStreamRef.current = null;
      }
      setIsWebcamActive(false);
      toast({
        title: "Webcam Stream Stopped",
        description: "Switched back to store camera stream simulation.",
      });
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        webcamStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setIsWebcamActive(true);
        toast({
          title: "Local Camera Connected",
          description: "Testing real-time on-device lean motion pipeline with your local webcam.",
        });
      } catch (err) {
        console.error("Webcam access denied or failed", err);
        toast({
          title: "Camera Access Unavailable",
          description: "Could not access local video device. Please ensure camera permissions are allowed.",
          variant: "destructive"
        });
      }
    }
  };

  const handleAddCamera = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamName || !newCamUrl) return;

    const newId = `cam-${cameras.length + 1}`;
    const newEntry: CameraStream = {
      id: newId,
      name: newCamName,
      location: 'Custom Stream Source',
      sourceType: newCamUrl.startsWith('rtsp://') ? 'rtsp' : 'onvif',
      url: newCamUrl,
      fps: 20,
      status: 'online',
      dwellAlerts: 0,
      peopleCount: 1,
      leanFiltering: 95.0,
      sceneImage: '/images/zen-cam/retail-theft-ai.jpg'
    };

    setCameras(prev => [...prev, newEntry]);
    setSelectedCameraId(newId);
    setNewCamName('');
    setNewCamUrl('');
    setIsAddModalOpen(false);

    toast({
      title: "Stream Pipeline Configured",
      description: `Connected to ${newEntry.name}. Stream pruning activated.`,
    });
  };

  const simulateIncident = (type: 'dwell' | 'queue' | 'sweethearting') => {
    let newEvt: VisionEvent;
    if (type === 'dwell') {
      newEvt = {
        id: `sim-${Date.now()}`,
        timestamp: 'Just now',
        cameraId: 'cam-2',
        cameraName: 'Aisle 3: Cosmetics',
        type: 'dwell',
        title: 'Prolonged Dwell Alert (92s)',
        description: 'Customer at cosmetics shelf for over 90s. Alert dispatched to sales associate mobile.',
        severity: 'medium'
      };
    } else if (type === 'queue') {
      newEvt = {
        id: `sim-${Date.now()}`,
        timestamp: 'Just now',
        cameraId: 'cam-1',
        cameraName: 'Checkout Desk 1',
        type: 'queue',
        title: 'Checkout Queue Exceeded (4)',
        description: 'Customer count at Till 1 exceeded service target. Till 2 alert sent.',
        severity: 'medium'
      };
    } else {
      newEvt = {
        id: `sim-${Date.now()}`,
        timestamp: 'Just now',
        cameraId: 'cam-1',
        cameraName: 'Checkout Desk 1',
        type: 'loss_prevention',
        title: 'Unscanned Bagged Item Detected',
        description: 'Item placed in bag area without barcode scanner read event. POS register locked for audit.',
        severity: 'high'
      };
    }

    setEvents(prev => [newEvt, ...prev]);
    toast({
      title: newEvt.title,
      description: newEvt.description,
      variant: newEvt.severity === 'high' ? 'destructive' : 'default',
    });
  };

  const activeCamera = cameras.find(c => c.id === selectedCameraId) || cameras[0];

  const filteredEvents = filterType === 'all' 
    ? events 
    : events.filter(e => e.type === filterType);

  return (
    <div className="flex flex-col gap-6 bg-background p-1 pb-10 sm:pb-1 w-full">
      {/* Top Header matching dashboard PageTitle standard */}
      <PageTitle 
        title="Zen Vision Stream Console" 
        subtitle="Ultra-lean RTSP/ONVIF video stream server. Analyzing customer footfall, dwell times, and POS-synchronized loss prevention."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={isWebcamActive ? "default" : "outline"}
            size="sm"
            onClick={toggleWebcam}
            className={cn("gap-1.5 text-xs font-dm-sans", isWebcamActive && "bg-primary hover:bg-primary/90")}
          >
            <Camera className="w-3.5 h-3.5" />
            {isWebcamActive ? "Stop Webcam Feed" : "Test With Local Webcam"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="gap-1.5 text-xs font-dm-sans border-border"
          >
            <Plus className="w-3.5 h-3.5 text-primary" />
            Add Camera Stream
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            className="gap-1.5 text-xs font-dm-sans text-muted-foreground"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600" /> : <Pause className="w-3.5 h-3.5 text-muted-foreground" />}
            {isPaused ? "Resume Pipeline" : "Pause Stream"}
          </Button>
        </div>
      </PageTitle>

      {/* 3-Column Summary Cards Grid (No box shadows, hairline 1px borders, rounded-lg, better icons) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Store Occupancy */}
        <div className="border border-border/60 bg-card rounded-lg p-4 shadow-none transition-colors hover:border-border">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground font-dm-sans">Store Occupancy</span>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold font-bricolage text-foreground">{activeOccupancy}</div>
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="text-muted-foreground text-[11px] font-dm-sans">Across 4 active zones</span>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 font-dm-sans">Live now</span>
            </div>
          </div>
        </div>

        {/* Card 2: Today's Footfall */}
        <div className="border border-border/60 bg-card rounded-lg p-4 shadow-none transition-colors hover:border-border">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground font-dm-sans">Today's Footfall</span>
            <Footprints className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold font-bricolage text-foreground">{dailyVisitors}</div>
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="text-muted-foreground text-[11px] font-dm-sans">Verified visitors</span>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 font-dm-sans">+18% vs yesterday</span>
            </div>
          </div>
        </div>

        {/* Card 3: POS Conversion */}
        <div className="border border-border/60 bg-card rounded-lg p-4 shadow-none transition-colors hover:border-border">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground font-dm-sans">POS Conversion</span>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold font-bricolage text-foreground">{conversionRate}%</div>
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="text-muted-foreground text-[11px] font-dm-sans">167 sales / 248 visits</span>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 font-dm-sans">Above target</span>
            </div>
          </div>
        </div>

        {/* Card 4: Lean Pruning Rate */}
        <div className="border border-border/60 bg-card rounded-lg p-4 shadow-none transition-colors hover:border-border">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground font-dm-sans">Lean Pruning Rate</span>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold font-bricolage text-foreground">{leanFilterRate}%</div>
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="text-muted-foreground text-[11px] font-dm-sans">Dropped pre-AI</span>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 font-dm-sans">94.8% compute saved</span>
            </div>
          </div>
        </div>

        {/* Card 5: Compute Conserved */}
        <div className="border border-border/60 bg-card rounded-lg p-4 shadow-none transition-colors hover:border-border">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground font-dm-sans">Compute Conserved</span>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold font-bricolage text-foreground">₦84,200</div>
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="text-muted-foreground text-[11px] font-dm-sans">Zero cloud streaming</span>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 font-dm-sans">~$55/day saved</span>
            </div>
          </div>
        </div>

        {/* Card 6: Server Footprint */}
        <div className="border border-border/60 bg-card rounded-lg p-4 shadow-none transition-colors hover:border-border">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground font-dm-sans">Server Footprint</span>
            <Server className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold font-bricolage text-foreground">&lt; 1.4%</div>
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="text-muted-foreground text-[11px] font-dm-sans">285MB RAM • 18ms</span>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 font-dm-sans">Ultra-lean CPU</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Viewport & Controls */}
      <div className="grid lg:grid-cols-12 gap-6 w-full">
        {/* Left Col: Live Stream Monitor & Interactive Overlays */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="border border-border/60 shadow-none overflow-hidden bg-card text-card-foreground rounded-lg">
            <div className="p-3 border-b border-border/60 bg-muted/40 dark:bg-neutral-900/90 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-sm text-foreground font-dm-sans">{activeCamera.name}</span>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] bg-background text-muted-foreground border-border/60">
                  {activeCamera.sourceType.toUpperCase()} • {activeCamera.fps} FPS
                </Badge>
              </div>

              {/* Viewport Overlay Toggles */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                  className={cn(
                    "h-7 px-2.5 text-[11px] font-mono rounded-md border shadow-none transition-colors",
                    showBoundingBoxes 
                      ? "bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 dark:text-primary-foreground font-medium" 
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                  title="Toggle Detection Reticles"
                >
                  {showBoundingBoxes ? <Eye className="w-3.5 h-3.5 mr-1" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
                  B-BOXES
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDwellHeatmap(!showDwellHeatmap)}
                  className={cn(
                    "h-7 px-2.5 text-[11px] font-mono rounded-md border shadow-none transition-colors",
                    showDwellHeatmap 
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium" 
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                  title="Toggle Dwell Heatmap"
                >
                  <Activity className="w-3.5 h-3.5 mr-1" />
                  DWELL
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLeanMeter(!showLeanMeter)}
                  className={cn(
                    "h-7 px-2.5 text-[11px] font-mono rounded-md border shadow-none transition-colors",
                    showLeanMeter 
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium" 
                      : "border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                  title="Toggle Lean Engine Status"
                >
                  <Gauge className="w-3.5 h-3.5 mr-1" />
                  LEAN
                </Button>
              </div>
            </div>

            {/* Video Canvas Container (True neutral black canvas) */}
            <div className="relative aspect-[16/9] w-full bg-black flex items-center justify-center overflow-hidden">
              {isWebcamActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                />
              ) : (
                <video
                  key={activeCamera.id}
                  src={activeCamera.videoUrl || "/zen%20ai%20camera.mp4"}
                  autoPlay
                  loop
                  muted
                  playsInline
                  poster={activeCamera.sceneImage}
                  className="w-full h-full object-cover object-center filter brightness-95"
                />
              )}

              {/* Shading Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/35 pointer-events-none" />

              {/* Top Viewport Information Bar */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
                <div className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-xs border border-white/15 font-mono text-[11px] text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>STREAM: {activeCamera.location}</span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-xs border border-white/15 font-mono text-[11px] text-orange-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>ON-EDGE INFERENCE: ACTIVE</span>
                </div>
              </div>

              {/* Dynamic Reticles & Bounding Boxes (Clean 1px hairline borders) */}
              {showBoundingBoxes && (
                <>
                  {/* Customer Checkout Reticle */}
                  <div className="absolute top-[42%] left-[26%] w-[20%] h-[42%] border border-emerald-400 bg-emerald-400/10 rounded-sm pointer-events-none transition-all">
                    <span className="absolute -top-5 left-0 px-1.5 py-0.5 bg-emerald-500 text-white font-mono text-[9px] font-semibold rounded-xs shadow-none flex items-center gap-1">
                      <ShoppingBag className="w-2.5 h-2.5" />
                      SHOPPER #04 • ACTIVE BASKET
                    </span>
                  </div>

                  {/* Cash Register Reticle */}
                  <div className="absolute top-[35%] right-[24%] w-[22%] h-[48%] border border-[#F47125] bg-[#F47125]/15 rounded-sm pointer-events-none transition-all animate-pulse">
                    <span className="absolute -top-5 left-0 px-1.5 py-0.5 bg-[#F47125] text-white font-mono text-[9px] font-semibold rounded-xs shadow-none flex items-center gap-1">
                      <CreditCard className="w-2.5 h-2.5" />
                      TILL ZONE • POS SYNCED
                    </span>
                  </div>

                  {/* Queue Counting Marker */}
                  <div className="absolute bottom-[28%] left-[8%] px-2.5 py-1 bg-black/80 backdrop-blur-xs border border-white/15 rounded-sm font-mono text-[10px] text-white pointer-events-none">
                    QUEUE LENGTH: <strong>2 PERSONS</strong> (WAIT: 1m 15s)
                  </div>
                </>
              )}

              {/* Dwell Heatmap Alert Pill */}
              {showDwellHeatmap && (
                <div className="absolute top-14 right-3 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-xs border border-amber-500/30 text-amber-300 font-mono text-xs flex items-center gap-1.5 pointer-events-none">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>MAX AISLE DWELL: <strong>68s</strong></span>
                </div>
              )}

              {/* Lean Efficiency Overlay */}
              {showLeanMeter && (
                <div className="absolute bottom-3 inset-x-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                  <div className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-xs border border-white/15 font-mono text-xs text-neutral-300 flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <Zap className="w-3.5 h-3.5" />
                      <span>{leanFilterRate}% IDLE FRAMES DROPPED</span>
                    </div>
                    <span className="text-neutral-500">|</span>
                    <span className="text-neutral-400 text-[11px]">
                      {totalFramesIngested.toLocaleString()} ingested • {framesFilteredOut.toLocaleString()} discarded
                    </span>
                  </div>

                  <div className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-xs border border-white/15 font-mono text-[11px] text-neutral-300 flex items-center gap-3">
                    <span>BANDWIDTH: <strong>42 KB/s</strong></span>
                    <span>RESOLUTION: <strong>1080p</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Multi-Camera Switcher Row */}
            <div className="p-2.5 bg-muted/30 dark:bg-neutral-950 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {cameras.map(cam => {
                const isSelected = cam.id === selectedCameraId;
                return (
                  <button
                    key={cam.id}
                    onClick={() => {
                      setSelectedCameraId(cam.id);
                      if (isWebcamActive) {
                        setIsWebcamActive(false);
                        if (webcamStreamRef.current) {
                          webcamStreamRef.current.getTracks().forEach(t => t.stop());
                        }
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md text-left transition-all text-xs font-dm-sans border shadow-none",
                      isSelected 
                        ? "bg-primary/10 border-primary text-foreground dark:text-white font-medium" 
                        : "bg-card dark:bg-neutral-900 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      isSelected ? "bg-primary animate-pulse" : "bg-emerald-500"
                    )} />
                    <div className="truncate flex-1 min-w-0">
                      <p className="font-semibold truncate text-foreground dark:text-white">{cam.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground truncate">{cam.location}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Quick Simulation & Testing Actions for Store Owner */}
          <Card className="border border-border/60 shadow-none p-4 bg-card rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold font-bricolage text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Simulate In-Store Vision Incidents
                </h4>
                <p className="text-xs text-muted-foreground font-dm-sans">
                  Test real-time event triggering, POS receipt sync, and cashier audit flags.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => simulateIncident('dwell')}
                  className="text-xs font-dm-sans gap-1.5 border-border/60 shadow-none"
                >
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  Simulate Dwell Alert
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => simulateIncident('queue')}
                  className="text-xs font-dm-sans gap-1.5 border-border/60 shadow-none"
                >
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  Simulate Queue Surge
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => simulateIncident('sweethearting')}
                  className="text-xs font-dm-sans gap-1.5 border-rose-500/30 hover:bg-rose-500/10 text-foreground shadow-none"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  Simulate Unscanned Bag
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Col: Real-time Event Feed & Lean Pipeline Settings */}
        <div className="lg:col-span-4 space-y-4">
          {/* Real-time Incident Feed */}
          <Card className="border border-border/60 shadow-none bg-card flex flex-col h-[520px] rounded-lg">
            <CardHeader className="p-4 border-b border-border/60 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold font-bricolage flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-primary" />
                  Real-Time Video Event Stream
                </CardTitle>
                <Badge variant="secondary" className="font-mono text-[10px] border-border/60">
                  {filteredEvents.length} Events
                </Badge>
              </div>
              <CardDescription className="text-xs font-dm-sans">
                Correlated with Zeneva POS receipts &amp; store movements.
              </CardDescription>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 pt-2">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'loss_prevention', label: 'Loss Prevention' },
                  { id: 'dwell', label: 'Dwell' },
                  { id: 'pos_sync', label: 'POS Sync' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-dm-sans font-medium transition-colors",
                      filterType === tab.id 
                        ? "bg-primary text-white" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-3 flex-1 overflow-y-auto space-y-2.5">
              {filteredEvents.map(evt => {
                const isLoss = evt.type === 'loss_prevention';
                const isDwell = evt.type === 'dwell';
                const isPos = evt.type === 'pos_sync';
                const isQueue = evt.type === 'queue';

                return (
                  <div
                    key={evt.id}
                    className="p-3 rounded-md border border-border/60 bg-card hover:border-border transition-all text-xs font-dm-sans space-y-1.5 shadow-none"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isLoss && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">THEFT AUDIT</Badge>}
                        {isDwell && <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-amber-600 border-amber-500/40">DWELL</Badge>}
                        {isPos && <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-emerald-600 border-emerald-500/40">POS SYNC</Badge>}
                        {isQueue && <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-blue-600 border-blue-500/40">QUEUE</Badge>}
                        <span className="font-semibold text-xs text-foreground truncate max-w-[170px]">
                          {evt.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{evt.timestamp}</span>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="pt-1 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span>{evt.cameraName}</span>
                      {evt.posReceiptId && (
                        <span className="text-primary font-medium">
                          RECEIPT #{evt.posReceiptId}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Screenpipe Lean Pipeline Parameters */}
          <Card className="border border-border/60 shadow-none p-4 bg-card space-y-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                Stream Pruning Engine
              </span>
              <Badge variant="outline" className="font-mono text-[10px] text-emerald-600 border-emerald-300">
                ACTIVE
              </Badge>
            </div>

            <div className="space-y-2 text-xs font-dm-sans">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Motion Delta Threshold:</span>
                <span className="font-mono font-bold text-foreground">12.5%</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Keyframe Extraction Mode:</span>
                <span className="font-mono font-bold text-foreground">Event-Only (Screenpipe)</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Edge Video Buffer:</span>
                <span className="font-mono font-bold text-foreground">Local NVMe (30 Days)</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Cloud Privacy Mode:</span>
                <span className="font-mono font-bold text-emerald-600">Zero Video Uploads</span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed pt-2 border-t border-border/60">
              Only anonymous geometric vectors and event timestamps are synchronized with your Zeneva cloud account. Video files remain entirely on-premises.
            </p>
          </Card>
        </div>
      </div>

      {/* Add Camera Stream Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold font-bricolage text-foreground flex items-center gap-2">
                <Video className="w-4 h-4 text-primary" />
                Connect RTSP / ONVIF Camera
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-muted-foreground hover:text-foreground text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCamera} className="space-y-3 font-dm-sans text-sm">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Camera Label / Location
                </label>
                <Input
                  placeholder="e.g. Backdoor Receiving Area or Register 2"
                  value={newCamName}
                  onChange={e => setNewCamName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  RTSP or ONVIF Stream URL
                </label>
                <Input
                  placeholder="rtsp://admin:password@192.168.1.120:554/stream1"
                  value={newCamUrl}
                  onChange={e => setNewCamUrl(e.target.value)}
                  required
                  className="font-mono text-xs"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Supports Hikvision, Dahua, Reolink, Axis, Uniview, and generic NVRs.
                </span>
              </div>

              <div className="p-3 bg-muted/60 rounded-xl text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Local-Only Stream Ingestion
                </p>
                <p>
                  Streams are decoded locally inside your network. No external camera credentials leave your premises.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Connect &amp; Start Pruning
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
