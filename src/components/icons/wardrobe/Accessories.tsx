import * as React from "react";
import Svg, { G, Path, Rect } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgAccessories = (props: SvgProps) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={24}
    height={24}
    {...props}
  >
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Path d="M7.3 9H3c-.6 0-1-.4-1-1V4c0-.6.4-1 1-1h4.3M6 6h3m4 0h.01" />
      <Rect width={10} height={8} x={7} y={2} rx={2} />
      <Path d="M16.7 3H21c.6 0 1 .4 1 1v4c0 .6-.4 1-1 1h-4.3m-6.2 1-8.1 6.2m19.2-7.4L12.2 16M3 22c-.6 0-1-.4-1-1v-4c0-.6.4-1 1-1h16l3 3-3 3Z" />
    </G>
  </Svg>
);
export default SvgAccessories;
