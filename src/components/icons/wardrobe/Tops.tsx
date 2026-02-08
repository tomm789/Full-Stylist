import * as React from "react";
import Svg, { Path } from "react-native-svg";
import type { SvgProps } from "react-native-svg";
const SvgTops = (props: SvgProps) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 256 256"
    width={24}
    height={24}
    {...props}
  >
    <Path d="M200 48h-20.69l-13.65-13.66a8.07 8.07 0 0 0-5.61-2.34H96a8 8 0 0 0-5.66 2.34L76.69 48H56a16 16 0 0 0-16 16v152a16 16 0 0 0 16 16h144a16 16 0 0 0 16-16V64a16 16 0 0 0-16-16m-38.76 4.56 6.76 6.75V112l-29.43-25.44ZM88 59.31l6.76-6.75 22.67 34L88 112ZM120 216H56V64h16v48a15.85 15.85 0 0 0 9.21 14.49A16.1 16.1 0 0 0 88 128a15.9 15.9 0 0 0 10.2-3.73.5.5 0 0 0 .11-.1L120 105.48Zm-9-168h34.1L128 73.58Zm89 168h-64V105.48l21.65 18.7a.5.5 0 0 0 .11.1A15.9 15.9 0 0 0 168 128a16.1 16.1 0 0 0 6.83-1.54A15.85 15.85 0 0 0 184 112V64h16Z" />
  </Svg>
);
export default SvgTops;
