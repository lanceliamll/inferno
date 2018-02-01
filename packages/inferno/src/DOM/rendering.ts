import { isBrowser, isFunction, isInvalid, isNullOrUndef, isUndefined, NO_OP, throwError, warning } from 'inferno-shared';
import { VNodeFlags } from 'inferno-vnode-flags';
import { createVNode, directClone, InfernoChildren, InfernoInput, normalizeChildren, options, VNode } from '../core/implementation';
import { hydrateRoot } from './hydration';
import { mount } from './mounting';
import { patch } from './patching';
import { remove } from './unmounting';
import { callAll, EMPTY_OBJ } from './utils/common';

const roots = options.roots;

if (process.env.NODE_ENV !== 'production') {
  if (isBrowser && document.body === null) {
    warning(
      'Inferno warning: you cannot initialize inferno without "document.body". Wait on "DOMContentLoaded" event, add script to bottom of body, or use async/defer attributes on script tag.'
    );
  }
}

const documentBody = isBrowser ? document.body : null;

export function render(input: InfernoInput, parentDom: Element | SVGAElement | DocumentFragment | HTMLElement | Node, callback?: Function): InfernoChildren {
  // Development warning
  if (process.env.NODE_ENV !== 'production') {
    if (documentBody === parentDom) {
      throwError('you cannot render() to the "document.body". Use an empty element as a container instead.');
    }
  }
  if ((input as string) === NO_OP) {
    return;
  }
  const lifecycle = [];
  const rootLen = roots.length;
  let rootInput;
  let index;

  for (index = 0; index < rootLen; index++) {
    if (roots[index] === parentDom) {
      rootInput = (parentDom as any).$V as VNode;
      break;
    }
  }

  if (isUndefined(rootInput)) {
    if (!isInvalid(input)) {
      if ((input as VNode).dom) {
        input = directClone(input as VNode);
      }
      if (!hydrateRoot(input, parentDom as any, lifecycle)) {
        mount(input as VNode, parentDom as Element, lifecycle, EMPTY_OBJ, false);
      }
      (parentDom as any).$V = input;
      roots.push(parentDom);
      rootInput = input;
    }
  } else {
    if (isNullOrUndef(input)) {
      remove(rootInput as VNode, parentDom as Element);
      roots.splice(index, 1);
    } else {
      if ((input as VNode).dom) {
        input = directClone(input as VNode);
      }
      patch(rootInput as VNode, input as VNode, parentDom as Element, lifecycle, EMPTY_OBJ, false);
      rootInput = (parentDom as any).$V = input;
    }
  }

  if (lifecycle.length > 0) {
    callAll(lifecycle);
  }

  if (isFunction(callback)) {
    callback();
  }
  if (rootInput && rootInput.flags & VNodeFlags.Component) {
    return rootInput.children;
  }
}

export function createRenderer(parentDom?) {
  return function renderer(lastInput, nextInput) {
    if (!parentDom) {
      parentDom = lastInput;
    }
    render(nextInput, parentDom);
  };
}

export function createPortal(children, container) {
  return normalizeChildren(createVNode(VNodeFlags.Portal, container, null, null, 0, null, isInvalid(children) ? null : children.key, null), children);
}
