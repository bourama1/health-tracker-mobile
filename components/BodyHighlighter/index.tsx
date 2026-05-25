import React, { memo, useCallback } from 'react';
import { Path } from 'react-native-svg';
// @ts-ignore
import differenceWith from 'ramda/src/differenceWith';

// @ts-ignore
import { bodyFront } from './assets/bodyFront';
// @ts-ignore
import { bodyBack } from './assets/bodyBack';
// @ts-ignore
import { SvgMaleWrapper } from './components/SvgMaleWrapper';
// @ts-ignore
import { bodyFemaleFront } from './assets/bodyFemaleFront';
// @ts-ignore
import { bodyFemaleBack } from './assets/bodyFemaleBack';
// @ts-ignore
import { SvgFemaleWrapper } from './components/SvgFemaleWrapper';

const comparison = (a: any, b: any) => a.slug === b.slug;

interface BodyProps {
  data: Array<{ slug: string; intensity?: number }>;
  gender?: 'male' | 'female';
  scale?: number;
  colors?: string[];
  zoomOnPress?: boolean;
  side?: 'front' | 'back';
  onBodyPartPress?: (bodyPart: any) => void;
  theme?: 'light' | 'dark';
}

const Body = ({
  data,
  gender = 'male',
  scale = 1,
  colors = ['#0984e3', '#74b9ff'],
  zoomOnPress = false,
  side = 'front',
  onBodyPartPress,
  theme = 'light',
}: BodyProps) => {
  const mergedBodyParts = useCallback(
    (dataSource: any[]) => {
      const innerData = data
        .map((d) => {
          return dataSource.find((t) => {
            return t.slug === d.slug;
          });
        })
        .filter(Boolean);

      const coloredBodyParts = innerData.map((d) => {
        const bodyPart = data.find((e) => e.slug === d?.slug);
        let colorIntensity = 1;
        if (bodyPart?.intensity) colorIntensity = bodyPart.intensity;
        return { ...d, color: colors[colorIntensity - 1] || colors[0] };
      });

      const formattedBodyParts = differenceWith(
        comparison,
        dataSource,
        data
      ).map((part: any) => ({
        ...part,
        color: theme === 'dark' ? '#333333' : part.color,
      }));

      return [...formattedBodyParts, ...coloredBodyParts];
    },
    [data, colors, theme]
  );

  const getColorToFill = (bodyPart: any) => {
    let color;
    if (bodyPart.intensity) {
      color = colors[bodyPart.intensity - 1] || colors[0];
    } else {
      color = bodyPart.color;
    }
    return color;
  };

  const renderBodySvg = (data: any) => {
    const SvgWrapper = gender === 'male' ? SvgMaleWrapper : SvgFemaleWrapper;
    return (
      <SvgWrapper side={side} scale={scale}>
        {mergedBodyParts(data).map((bodyPart: any) => {
          if (bodyPart.pathArray) {
            return bodyPart.pathArray.map((path: string) => {
              return (
                <Path
                  key={path}
                  onPress={() => onBodyPartPress?.(bodyPart)}
                  id={bodyPart.slug}
                  fill={getColorToFill(bodyPart)}
                  d={path}
                />
              );
            });
          }
          return null;
        })}
      </SvgWrapper>
    );
  };

  if (gender === 'female') {
    return renderBodySvg(side === 'front' ? bodyFemaleFront : bodyFemaleBack);
  }

  return renderBodySvg(side === 'front' ? bodyFront : bodyBack);
};

export default memo(Body);
