// @flow
import { type Position } from 'css-box-model';
import getDragImpact from '../../../../../../src/state/get-drag-impact';
import { add, patch, subtract } from '../../../../../../src/state/position';
import { vertical, horizontal } from '../../../../../../src/state/axis';
import { getPreset } from '../../../../../utils/dimension';
import getDisplacementMap from '../../../../../../src/state/get-displacement-map';
import getDisplacedBy from '../../../../../../src/state/get-displaced-by';
import type {
  Axis,
  DragImpact,
  DisplacementMap,
  Viewport,
  Displacement,
  DisplacedBy,
} from '../../../../../../src/types';
import {
  backward,
  forward,
} from '../../../../../../src/state/user-direction/user-direction-preset';
import getHomeOnLift from '../../../../../../src/state/get-home-on-lift';
import getVisibleDisplacement from '../../../../../utils/get-displacement/get-visible-displacement';
import getNotAnimatedDisplacement from '../../../../../utils/get-displacement/get-not-animated-displacement';

[vertical, horizontal].forEach((axis: Axis) => {
  describe(`on ${axis.direction} axis`, () => {
    const preset = getPreset(axis);
    const viewport: Viewport = preset.viewport;

    const crossAxisCenter: number =
      preset.inHome3.page.borderBox.center[axis.crossAxisLine];

    // behind start so will displace forwards
    const displacedBy: DisplacedBy = getDisplacedBy(
      axis,
      preset.inHome3.displaceBy,
    );
    const { onLift, impact: homeImpact } = getHomeOnLift({
      draggable: preset.inHome3,
      home: preset.home,
      draggables: preset.draggables,
      viewport: preset.viewport,
    });

    // moving inHome3 back past inHome1
    const onEndOfInHome1: Position = patch(
      axis.line,
      preset.inHome1.page.borderBox[axis.end],
      crossAxisCenter,
    );

    const goingBackwards: DragImpact = getDragImpact({
      pageBorderBoxCenter: onEndOfInHome1,
      draggable: preset.inHome3,
      draggables: preset.draggables,
      droppables: preset.droppables,
      previousImpact: homeImpact,
      viewport,
      userDirection: backward,
      onLift,
    });

    it.only('should displace items when moving backwards onto their bottom edge', () => {
      // ordered by closest to current location
      const displaced: Displacement[] = [
        // displacement is not animated as it started not animated
        getVisibleDisplacement(preset.inHome1),
        getVisibleDisplacement(preset.inHome2),
        // inHome3 is not displaced as it is the dragging item

        // inHome4 would have been displaced on lift so it won't be animated
        getNotAnimatedDisplacement(preset.inHome4),
      ];
      const expected: DragImpact = {
        movement: {
          displaced,
          map: getDisplacementMap(displaced),
          displacedBy,
        },
        direction: axis.direction,
        destination: {
          // is now in position of inHome1
          droppableId: preset.home.descriptor.id,
          index: preset.inHome1.descriptor.index,
        },
        merge: null,
      };

      expect(goingBackwards).toEqual(expected);
    });

    it.only('should end displacement if moving forward over the displaced top edge', () => {
      const topEdgeOfInHome1: number =
        preset.inHome1.page.borderBox[axis.start];
      const displacedTopEdgeOfInHome1: number =
        topEdgeOfInHome1 + preset.inHome3.displaceBy[axis.line];

      const displacedTopEdge: Position = patch(
        axis.line,
        // onto top edge with without displacement
        displacedTopEdgeOfInHome1,
        // no change
        crossAxisCenter,
      );
      const beforeDisplacedTopEdge: Position = subtract(
        displacedTopEdge,
        patch(axis.line, 1),
      );
      const afterDisplacedTopEdge: Position = add(
        displacedTopEdge,
        patch(axis.line, 1),
      );

      // still not far enough
      {
        const impact: DragImpact = getDragImpact({
          pageBorderBoxCenter: beforeDisplacedTopEdge,
          draggable: preset.inHome3,
          draggables: preset.draggables,
          droppables: preset.droppables,
          previousImpact: goingBackwards,
          viewport,
          userDirection: forward,
          onLift,
        });
        expect(impact).toEqual(goingBackwards);
      }
      {
        // continue to displace as we are on the edge
        const impact: DragImpact = getDragImpact({
          pageBorderBoxCenter: displacedTopEdge,
          draggable: preset.inHome3,
          draggables: preset.draggables,
          droppables: preset.droppables,
          previousImpact: goingBackwards,
          viewport,
          userDirection: forward,
          onLift,
        });
        expect(impact).toEqual(goingBackwards);
      }
      // no longer displace as we have moved past the displaced top edge
      {
        const impact: DragImpact = getDragImpact({
          pageBorderBoxCenter: afterDisplacedTopEdge,
          draggable: preset.inHome3,
          draggables: preset.draggables,
          droppables: preset.droppables,
          previousImpact: goingBackwards,
          viewport,
          userDirection: forward,
          onLift,
        });
        const displaced: Displacement[] = [
          getVisibleDisplacement(preset.inHome2),
          // not displacing inHome3 as it is the dragging item
          getNotAnimatedDisplacement(preset.inHome4),
        ];
        const expected: DragImpact = {
          movement: {
            displaced,
            map: getDisplacementMap(displaced),
            displacedBy,
          },
          direction: axis.direction,
          destination: {
            droppableId: preset.home.descriptor.id,
            // is now in position of inHome2
            index: preset.inHome2.descriptor.index,
          },
          merge: null,
        };
        expect(impact).toEqual(expected);
      }
    });
  });
});
