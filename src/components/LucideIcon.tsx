/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import * as Icons from 'lucide-react';

interface LucideIconProps {
  name: string;
  className?: string;
  size?: number;
}

export default function LucideIcon({ name, className = '', size = 20 }: LucideIconProps) {
  // Safe lookup with fallback
  const IconComponent = (Icons as Record<string, React.ComponentType<{ className?: string; size?: number }>>)[name];
  
  if (!IconComponent) {
    // Return HelpCircle as standard fallback
    const Fallback = Icons.HelpCircle;
    return <Fallback className={className} size={size} />;
  }
  
  return <IconComponent className={className} size={size} />;
}
