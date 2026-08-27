"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { GitFork, Search, X, Film, User, ArrowRight, Loader2, ZoomIn, ZoomOut, Maximize, Minimize } from "lucide-react";
import clsx from "clsx";
import type { SearchResult, ConnectionPath, PathNode, ApiError } from "@/types";
import * as d3 from "d3";

// ─── Person Picker ────────────────────────────────────────────────────────────

interface PickerProps {
  label: string;
  value: SearchResult | null;
  onChange: (v: SearchResult | null) => void;
  excludeId?: string;
}

function PersonPicker({ label, value, onChange, excludeId }: PickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        const people = (data.results as SearchResult[]).filter(
          (r) => r.type === "person" && r.id !== excludeId
        );
        setResults(people);
      }
    } finally {
      setLoading(false);
    }
  }, [excludeId]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(q), 280);
  };

  const select = (r: SearchResult) => {
    onChange(r);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (value) {
    return (
      <div className="glass-card flex items-center gap-3 p-3 rounded-xl border border-white/10">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-elevated border border-white/10 shrink-0">
          {value.image
            ? <img src={value.image} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><User size={16} className="text-gray-400" /></div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">{label}</p>
          <p className="font-medium text-white text-sm truncate">{value.label}</p>
        </div>
        <button onClick={clear} className="text-gray-400 hover:text-white transition-colors p-1" aria-label="Clear selection">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="block text-xs text-gray-400 mb-1.5 font-medium">{label}</label>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={handleInput}
          onFocus={() => query && setOpen(true)}
          placeholder="Search for a person…"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-9 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-transparent transition-all"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 glass-card rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => select(r)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-elevated border border-white/10 shrink-0">
                {r.image
                  ? <img src={r.image} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><User size={12} className="text-gray-600" /></div>
                }
              </div>
              <div>
                <p className="text-sm text-white">{r.label}</p>
                <p className="text-xs text-gray-500">{r.sublabel}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && query.trim() && results.length === 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 glass-card px-4 py-6 text-center text-gray-400 rounded-xl shadow-2xl shadow-black/50 border border-white/10">
          No people found for "{query}"
        </div>
      )}
    </div>
  );
}

// ─── Real-Time Graph Visualizer ─────────────────────────────────────────────

interface GraphVisualizerProps {
  path: ConnectionPath;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'person' | 'movie';
  sublabel?: string;
  image?: string;
  x?: number;
  y?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

function GraphVisualizer({ path }: GraphVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showLabels, setShowLabels] = useState(true);

  // Build graph data
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = path.nodes.map(node => ({
      id: node.id,
      label: node.label,
      type: node.type as 'person' | 'movie',
      sublabel: node.sublabel,
    }));

    const links: GraphLink[] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      links.push({
        source: nodes[i].id,
        target: nodes[i + 1].id,
      });
    }

    return { nodes, links };
  }, [path]);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.max(400, rect.width - 40),
          height: Math.max(300, Math.min(600, window.innerHeight * 0.6)),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Render graph with D3
  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Define gradients
    const defs = svg.append("defs");
    
    // Person gradient
    const personGrad = defs.append("radialGradient")
      .attr("id", "personGradient")
      .attr("cx", "30%")
      .attr("cy", "30%");
    personGrad.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#60A5FA");
    personGrad.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#3B82F6");

    // Movie gradient
    const movieGrad = defs.append("radialGradient")
      .attr("id", "movieGradient")
      .attr("cx", "30%")
      .attr("cy", "30%");
    movieGrad.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#34D399");
    movieGrad.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#10B981");

    // Glow filter
    const glow = defs.append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");
    glow.append("feGaussianBlur")
      .attr("stdDeviation", "3")
      .attr("result", "coloredBlur");
    const feMerge = glow.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Create simulation
    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(graphData.links)
        .id((d: GraphNode) => d.id)
        .distance(150)
        .strength(0.8))
      .force("charge", d3.forceManyBody()
        .strength(-500)
        .distanceMin(50)
        .distanceMax(300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(45));

    // Create links
    const link = g.append("g")
      .selectAll("line")
      .data(graphData.links)
      .enter().append("line")
      .attr("stroke", "rgba(255,255,255,0.2)")
      .attr("stroke-width", 2)
      .attr("stroke-linecap", "round");

    // Animate links on hover
    link.on("mouseenter", function(this: SVGLineElement) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("stroke", "rgba(255,255,255,0.6)")
        .attr("stroke-width", 3);
    }).on("mouseleave", function(this: SVGLineElement) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("stroke", "rgba(255,255,255,0.2)")
        .attr("stroke-width", 2);
    });

    // Create node groups
    const node = g.append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .enter().append("g")
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", function(this: SVGGElement, event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          const d = event.subject;
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", function(this: SVGGElement, event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
          const d = event.subject;
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", function(this: SVGGElement, event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
          if (!event.active) simulation.alphaTarget(0);
          const d = event.subject;
          d.fx = null;
          d.fy = null;
        })
      );

    // Node circles
    node.append("circle")
      .attr("r", (d: GraphNode) => d.type === 'person' ? 30 : 25)
      .attr("fill", (d: GraphNode) => d.type === 'person' ? "url(#personGradient)" : "url(#movieGradient)")
      .attr("stroke", "rgba(255,255,255,0.3)")
      .attr("stroke-width", 2)
      .attr("filter", "url(#glow)")
      .style("cursor", "pointer");

    // Node icons
    node.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("fill", "white")
      .attr("font-size", (d: GraphNode) => d.type === 'person' ? 16 : 14)
      .text((d: GraphNode) => d.type === 'person' ? "👤" : "🎬")
      .style("pointer-events", "none");

    // Node labels (if enabled)
    if (showLabels) {
      const labelGroup = node.append("g")
        .attr("transform", "translate(0, 40)");

      labelGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("font-size", "12px")
        .attr("font-weight", "500")
        .style("text-shadow", "0 2px 8px rgba(0,0,0,0.8)")
        .text((d: GraphNode) => d.label.length > 20 ? d.label.slice(0, 18) + '...' : d.label);

      labelGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "16")
        .attr("fill", "rgba(255,255,255,0.5)")
        .attr("font-size", "10px")
        .style("text-shadow", "0 2px 8px rgba(0,0,0,0.8)")
        .text((d: GraphNode) => d.sublabel || '');
    }

    // Hover tooltip
    node.append("title")
      .text((d: GraphNode) => `${d.label}\n${d.sublabel || ''}\nType: ${d.type}`);

    // Click handler - navigate to detail page
    node.on("click", (event: MouseEvent, d: GraphNode) => {
      const href = d.type === 'movie' ? `/movies/${d.id}` : `/people/${d.id}`;
      window.location.href = href;
    });

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => (d.source as GraphNode).x!)
        .attr("y1", (d: any) => (d.source as GraphNode).y!)
        .attr("x2", (d: any) => (d.target as GraphNode).x!)
        .attr("y2", (d: any) => (d.target as GraphNode).y!);

      node.attr("transform", (d: GraphNode) => `translate(${d.x},${d.y})`);
    });

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 2])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr("transform", event.transform.toString());
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [graphData, dimensions, showLabels]);

  // Reset zoom function
  const resetZoom = useCallback(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition()
        .duration(500)
        .call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity);
    }
  }, []);

  return (
    <div className="relative">
      <div 
        ref={containerRef} 
        className="glass-card rounded-xl border border-white/10 p-4 relative overflow-hidden"
        style={{ minHeight: '400px' }}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-auto"
          style={{ background: 'transparent' }}
        />
        
        {/* Controls */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className="p-2 glass-card rounded-lg border border-white/10 hover:border-white/30 transition-colors text-white/70 hover:text-white"
            title="Toggle labels"
          >
            {showLabels ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          <button
            onClick={resetZoom}
            className="p-2 glass-card rounded-lg border border-white/10 hover:border-white/30 transition-colors text-white/70 hover:text-white"
            title="Reset zoom"
          >
            <Maximize size={16} />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute top-4 left-4 flex gap-4 text-xs">
          <div className="flex items-center gap-2 text-white/70">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Person</span>
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span>Movie</span>
          </div>
        </div>

        {/* Stats */}
        <div className="absolute top-4 right-4 text-xs text-white/50">
          {graphData.nodes.length} nodes • {graphData.links.length} connections
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConnectPage() {
  const [from, setFrom] = useState<SearchResult | null>(null);
  const [to, setTo] = useState<SearchResult | null>(null);
  const [path, setPath] = useState<ConnectionPath | null | undefined>(undefined);
  const [noPath, setNoPath] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSearch = from && to && from.id !== to.id;

  const findConnection = async () => {
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    setPath(undefined);
    setNoPath(false);

    try {
      const res = await fetch(`/api/connect?from=${from.id}&to=${to.id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      if (!data.path) {
        setNoPath(true);
      } else {
        setPath(data.path);
      }
    } catch {
      setError("Network error — could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-search when both selected
  useEffect(() => {
    if (from && to) findConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from?.id, to?.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-brand-600/20 border border-brand-500/30 mb-4 backdrop-blur-sm">
            <GitFork size={28} className="text-brand-400" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Six Degrees
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Explore the hidden connections between actors, directors, and movies.
            Watch the graph come alive as it finds the shortest path through shared films.
          </p>
        </div>

        {/* Pickers */}
        <div className="glass-card rounded-2xl border border-white/10 p-6 mb-6 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PersonPicker
              label="From"
              value={from}
              onChange={(v) => { setFrom(v); setPath(undefined); setNoPath(false); }}
              excludeId={to?.id}
            />
            <PersonPicker
              label="To"
              value={to}
              onChange={(v) => { setTo(v); setPath(undefined); setNoPath(false); }}
              excludeId={from?.id}
            />
          </div>

          <button
            onClick={findConnection}
            disabled={!canSearch || loading}
            className="w-full mt-4 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> Searching the graph…</>
              : <><Search size={18} /> Find Connection</>
            }
          </button>
        </div>

        {/* Result */}
        {error && (
          <div className="glass-card border-red-500/30 p-4 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {noPath && !loading && (
          <div className="glass-card p-12 text-center rounded-2xl border border-white/10 fade-up">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-xl font-medium text-white mb-2">No path found</p>
            <p className="text-gray-400 max-w-md mx-auto">
              These two people don't appear to share any connection through the current dataset.
              Try different combinations!
            </p>
          </div>
        )}

        {path && !loading && (
          <div className="fade-up">
            {/* Stats header */}
            <div className="glass-card rounded-2xl border border-white/10 p-6 mb-6 backdrop-blur-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500/20 to-brand-600/20 border border-brand-500/30 flex items-center justify-center">
                    <span className="text-brand-400 font-bold text-lg">{path.hops}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {path.hops === 0
                        ? "They're the same person!"
                        : path.hops === 1
                        ? "Direct connection — 1 shared film"
                        : `Connected through ${path.hops} film${path.hops !== 1 ? "s" : ""}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {path.nodes.length} nodes in path • {path.hops} degrees of separation
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs">
                    👤 {path.nodes.filter(n => n.type === 'person').length} people
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                    🎬 {path.nodes.filter(n => n.type === 'movie').length} movies
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Graph */}
            <GraphVisualizer path={path} />

            {/* Path description */}
            <div className="mt-6 glass-card rounded-2xl border border-white/10 p-6 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Path Description</h3>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {path.nodes.map((node, i) => (
                  <span key={`${node.id}-${i}`} className="flex items-center gap-2">
                    <Link
                      href={node.type === 'movie' ? `/movies/${node.id}` : `/people/${node.id}`}
                      className={clsx(
                        "px-3 py-1 rounded-full transition-colors hover:scale-105 transform",
                        node.type === 'movie'
                          ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20"
                      )}
                    >
                      {node.type === 'movie' ? '🎬' : '👤'} {node.label}
                    </Link>
                    {i < path.nodes.length - 1 && (
                      <ArrowRight size={14} className="text-gray-600" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!from && !to && (
          <div className="glass-card p-12 text-center rounded-2xl border border-white/10">
            <div className="text-6xl mb-4">🎬</div>
            <p className="font-medium text-white text-lg mb-2">Ready to explore?</p>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Search for two actors, directors, or any mix. Watch as the graph database
              finds the shortest path in milliseconds using{' '}
              <code className="text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded font-mono text-xs">
                shortestPath()
              </code>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}