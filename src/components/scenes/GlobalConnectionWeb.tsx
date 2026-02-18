import { useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";

const NODES = [
  { x: 50, y: 50, color: "hsl(var(--brand-blue))", label: "Americas", size: 8 },
  { x: 48, y: 22, color: "hsl(var(--brand-green))", label: "Europe", size: 7 },
  { x: 62, y: 30, color: "hsl(var(--brand-gold))", label: "Asia", size: 9 },
  { x: 55, y: 68, color: "hsl(var(--brand-orange))", label: "Africa", size: 6 },
  { x: 75, y: 55, color: "hsl(var(--brand-purple))", label: "Pacific", size: 7 },
  { x: 25, y: 45, color: "hsl(var(--brand-red))", label: "Lat America", size: 6 },
  { x: 65, y: 75, color: "hsl(var(--brand-blue))", label: "Oceania", size: 5 },
  { x: 38, y: 18, color: "hsl(var(--brand-gold))", label: "N. Africa", size: 5 },
  { x: 80, y: 25, color: "hsl(var(--brand-orange))", label: "E. Asia", size: 6 },
];

const CONNECTIONS = [
  [0, 1], [0, 2], [0, 5], [1, 2], [1, 3], [2, 4], [2, 8], [3, 6], [4, 6], [0, 3], [1, 7], [5, 3],
];

const GlobalConnectionWeb = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="about"
      ref={ref}
      className="relative min-h-screen flex flex-col items-center justify-center py-24 overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 60% 40%, hsl(213 94% 54% / 0.08) 0%, hsl(var(--background)) 60%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 w-full">
        {/* Heading */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl sm:text-5xl font-black mb-4">
            <span className="text-gradient-brand">Connecting the World</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            inyito.com bridges every corner of the globe — one living, breathing network of people.
          </p>
        </motion.div>

        {/* Globe Viz */}
        <div className="relative mx-auto" style={{ maxWidth: 700, height: 420 }}>
          <svg
            viewBox="0 0 100 80"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Globe circle */}
            <motion.circle
              cx="50" cy="45" r="36"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="0.3"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.3 }}
            />
            {/* Latitude lines */}
            {[-20, 0, 20].map((offset, i) => (
              <motion.ellipse
                key={i}
                cx="50" cy={45 + offset * 0.7}
                rx={Math.sqrt(36 * 36 - offset * offset * 0.49)}
                ry={4}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="0.2"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 0.5 } : {}}
                transition={{ delay: 0.4 + i * 0.1 }}
              />
            ))}
            {/* Longitude lines */}
            {[0, 60, 120].map((angle, i) => (
              <motion.ellipse
                key={i}
                cx="50" cy="45"
                rx="4"
                ry="36"
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="0.2"
                transform={`rotate(${angle}, 50, 45)`}
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 0.5 } : {}}
                transition={{ delay: 0.5 + i * 0.1 }}
              />
            ))}

            {/* Connection lines */}
            {CONNECTIONS.map(([a, b], i) => {
              const nodeA = NODES[a];
              const nodeB = NODES[b];
              const ax = nodeA.x * 0.7 + 15;
              const ay = nodeA.y * 0.65 + 10;
              const bx = nodeB.x * 0.7 + 15;
              const by = nodeB.y * 0.65 + 10;
              return (
                <motion.line
                  key={i}
                  x1={ax} y1={ay} x2={bx} y2={by}
                  stroke={nodeA.color}
                  strokeWidth="0.3"
                  strokeOpacity="0.5"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
                  transition={{ duration: 1.2, delay: 1 + i * 0.1 }}
                />
              );
            })}

            {/* Pulse rings on nodes */}
            {NODES.map((node, i) => {
              const nx = node.x * 0.7 + 15;
              const ny = node.y * 0.65 + 10;
              return (
                <g key={i}>
                  <motion.circle
                    cx={nx} cy={ny}
                    r={node.size * 0.8}
                    fill={node.color}
                    fillOpacity="0.15"
                    animate={{ r: [node.size * 0.8, node.size * 1.8, node.size * 0.8], opacity: [0.15, 0, 0.15] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
                  />
                  <motion.circle
                    cx={nx} cy={ny}
                    r={node.size * 0.4}
                    fill={node.color}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={isInView ? { scale: 1, opacity: 1 } : {}}
                    transition={{ duration: 0.5, delay: 0.6 + i * 0.15, type: "spring" }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Floating labels */}
          {NODES.slice(0, 5).map((node, i) => (
            <motion.div
              key={i}
              className="absolute text-xs font-semibold px-2 py-0.5 rounded-full border"
              style={{
                left: `${node.x * 0.7 + 13}%`,
                top: `${node.y * 0.65 + 8}%`,
                color: node.color,
                borderColor: `${node.color}50`,
                backgroundColor: `${node.color}15`,
                transform: "translate(-50%, -180%)",
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 2 + i * 0.15 }}
            >
              {node.label}
            </motion.div>
          ))}
        </div>

        {/* Stats Row */}
        <motion.div
          className="grid grid-cols-3 gap-6 mt-12 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 2.5, duration: 0.8 }}
        >
          {[
            { value: "190+", label: "Countries", color: "hsl(var(--brand-blue))" },
            { value: "∞", label: "Connections", color: "hsl(var(--brand-gold))" },
            { value: "All Ages", label: "Supported", color: "hsl(var(--brand-green))" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl sm:text-4xl font-black" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-muted-foreground text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default GlobalConnectionWeb;
