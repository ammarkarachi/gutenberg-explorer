/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';

// Define TypeScript interfaces
interface Character {
  id: string;
  name: string;
  group: string;
  importance: number;
  x?: number;
  y?: number;
}

interface Relationship {
  source: string | Character;
  target: string | Character;
  type: string;
  strength: number;
  sentiment: number;
}

interface CharacterData {
  nodes: Character[];
  links: Relationship[];
}

interface GraphNode extends Character {
  x: number;
  y: number;
}

interface GraphLink extends Omit<Relationship, 'source' | 'target'> {
  source: GraphNode;
  target: GraphNode;
}

interface ProcessedGraph {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface CharacterRelationshipGraphProps {
  characterData?: CharacterData;
  width?: number;
  height?: number;
}

const CharacterRelationshipGraph: React.FC<CharacterRelationshipGraphProps> = ({ 
  characterData, 
  width = 800, 
  height = 500 
}) => {
  const [graph, setGraph] = useState<ProcessedGraph | null>(null);
  const [selected, setSelected] = useState<GraphNode | GraphLink | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);
  const simulationRef = useRef<any>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  
  // Set mounted state for CSR
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  
  // Initialize and run the force simulation
  useEffect(() => {
    if (!mounted) return;
    
    // Import d3 modules dynamically to avoid SSR issues
    const importModules = async () => {
      try {
        const d3 = await import('d3');
        const data = characterData || { nodes: [], links: [] };
        
        // Process the data to prepare for force layout
        const nodes: GraphNode[] = data.nodes.map(node => ({
          ...node,
          x: Math.random() * width,
          y: Math.random() * height
        }));
        
        // Create a map for quick node lookup
        const nodeMap: Record<string, GraphNode> = {};
        nodes.forEach(node => {
          nodeMap[node.id] = node;
        });
        
        // Process links to use actual node references
        const links: GraphLink[] = data.links.map(link => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;
          
          return {
            ...link,
            source: nodeMap[sourceId] || nodes[0],
            target: nodeMap[targetId] || nodes[0]
          };
        });
        
        // Initialize the simulation
        simulationRef.current = d3.forceSimulation(nodes)
          .force('charge', d3.forceManyBody().strength(-100))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
          .on('tick', () => {
            setGraph({ 
              nodes: [...nodes], 
              links: [...links] 
            });
          });
        
      } catch (error) {
        console.error('Error loading d3 modules:', error);
      }
    };
    
    importModules();
    
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [characterData, width, height, mounted]);
  
  // Clear selection when clicking on the background
  const handleBackgroundClick = (): void => {
    setSelected(null);
  };
  
  // Handle node click
  const handleNodeClick = (event: React.MouseEvent, node: GraphNode): void => {
    event.stopPropagation();
    setSelected(node);
  };
  
  // Handle link click
  const handleLinkClick = (event: React.MouseEvent, link: GraphLink): void => {
    event.stopPropagation();
    setSelected(link);
  };
  
  // Color helper functions
  const getGroupColor = (group: string): string => {
    const colors: Record<string, string> = {
      'protagonists': '#4299E1',
      'allies': '#48BB78',
      'villains': '#F56565',
      'neutral': '#A0AEC0',
      'faction': '#9F7AEA'
    };
    return colors[group] || '#9F7AEA';
  };
  
  const getSentimentColor = (sentiment: number): string => {
    if (sentiment > 0) return '#48BB78';
    if (sentiment < 0) return '#F56565';
    return '#A0AEC0';
  };
  
  const getNodeRadius = (importance: number): number => {
    return 5 + (importance || 5);
  };
  
  const getLinkWidth = (strength: number): number => {
    return 1 + (strength || 1) / 4;
  };
  
  // Check if the current object is a node
  const isNode = (obj: any): obj is GraphNode => {
    return obj && 'name' in obj;
  };
  
  if (!mounted || !graph) {
    return (
      <div className="w-full h-full bg-[#121827] rounded-lg flex items-center justify-center">
        <p className="text-gray-400">Loading character relationship graph...</p>
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-full bg-[#121827] rounded-lg overflow-hidden">
      <h2 className="py-6 text-xl text-center text-gray-400">Character Relationship Graph</h2>
      
      <div className="relative w-full h-full" onClick={handleBackgroundClick}  >
        <svg ref={svgRef} width={width} height={height}>
          <rect width={width} height={height} fill="#121827" rx={14} />
          
          {/* Render the links */}
          {graph.links.map((link, i) => (
            <line
              key={`link-${i}`}
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke={link === selected ? '#3B82F6' : getSentimentColor(link.sentiment)}
              strokeWidth={getLinkWidth(link.strength)}
              strokeOpacity={0.7}
              strokeLinecap="round"
              style={{ cursor: 'pointer' }}
              onClick={(e) => handleLinkClick(e, link)}
            />
          ))}
          
          {/* Render the nodes */}
          {graph.nodes.map((node, i) => (
            <g key={`node-${i}`} onClick={(e) => handleNodeClick(e, node)}>
              <circle
                cx={node.x}
                cy={node.y}
                r={getNodeRadius(node.importance)}
                fill={node === selected ? '#3B82F6' : getGroupColor(node.group)}
                opacity={0.9}
                stroke={node === selected ? 'white' : 'none'}
                strokeWidth={node === selected ? 2 : 0}
                style={{ cursor: 'pointer' }}
              />
              <text
                x={node.x}
                y={node.y - getNodeRadius(node.importance) - 6}
                fontSize={10}
                textAnchor="middle"
                fill="#C7D1E3"
                style={{ pointerEvents: 'none' }}
              >
                {node.name}
              </text>
            </g>
          ))}
        </svg>
        
        {selected && (
          <div className="absolute top-4 right-4 p-4 bg-[#1e293b] rounded-lg shadow-lg max-w-xs border border-gray-700">
            {isNode(selected) ? (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-200">{selected.name}</h3>
                <p className="text-sm text-gray-400">Group: <span className="font-medium text-gray-300">{selected.group}</span></p>
                <p className="text-sm text-gray-400">Importance: <span className="font-medium text-gray-300">{selected.importance}/10</span></p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-200">Relationship</h3>
                <p className="text-sm text-gray-400">{selected.source.name} → {selected.target.name}</p>
                <p className="text-sm text-gray-400">Type: <span className="font-medium text-gray-300">{selected.type}</span></p>
                <p className="text-sm text-gray-400">Strength: <span className="font-medium text-gray-300">{selected.strength}/10</span></p>
                <p className="text-sm text-gray-400">
                  Sentiment: 
                  <span className={`font-medium ml-1 ${
                    selected.sentiment > 0 ? 'text-green-400' : 
                    selected.sentiment < 0 ? 'text-red-400' : 
                    'text-gray-400'
                  }`}>
                    {selected.sentiment}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterRelationshipGraph;