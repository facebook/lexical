/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const typedoc = require('typedoc');

// Temporary patch to support TypeDoc 0.23 until https://github.com/jonchardy/typedoc-plugin-no-inherit/pull/31 is merged

exports.load = function (app) {
  new NoInheritPlugin().initialize(app);
};
/**
 * A handler that deals with inherited reflections.
 */
class NoInheritPlugin {
  /**
   * Create a new NoInheritPlugin instance.
   */
  initialize(app) {
    app.converter.on(typedoc.Converter.EVENT_BEGIN, this.onBegin.bind(this));
    app.converter.on(
      typedoc.Converter.EVENT_CREATE_DECLARATION,
      this.onDeclaration.bind(this),
      null,
      -1100,
    ); // after ImplementsPlugin
    app.converter.on(
      typedoc.Converter.EVENT_RESOLVE_BEGIN,
      this.onBeginResolve.bind(this),
    );
    this.logger = app.logger;
  }
  /**
   * Triggered when the converter begins converting a project.
   *
   * @param context  The context object describing the current state the converter is in.
   */
  onBegin(context) {
    this.noInherit = [];
    this.inheritedReflections = [];
  }
  /**
   * Triggered when the converter has created a declaration or signature reflection.
   *
   * Builds the list of classes/interfaces that don't inherit docs and
   * the list of reflections that are inherited that could end up being removed.
   *
   * @param context  The context object describing the current state the converter is in.
   * @param reflection  The reflection that is currently processed.
   * @param node  The node that is currently processed if available.
   */
  onDeclaration(context, reflection, node) {
    if (reflection instanceof typedoc.DeclarationReflection) {
      // class or interface that won't inherit docs
      if (
        reflection.kindOf(typedoc.ReflectionKind.ClassOrInterface) &&
        reflection.comment &&
        reflection.comment.getTag('@noInheritDoc')
      ) {
        this.noInherit.push(reflection);
        reflection.comment.removeTags('@noInheritDoc');
      }
      // class or interface member inherited from a super
      if (
        reflection.inheritedFrom &&
        reflection.parent &&
        reflection.parent.kindOf(typedoc.ReflectionKind.ClassOrInterface) &&
        (!reflection.overwrites ||
          (reflection.overwrites &&
            reflection.overwrites !== reflection.inheritedFrom))
      ) {
        this.inheritedReflections.push(reflection);
      }
    }
    //console.log(this.noInherit)
  }
  /**
   * Triggered when the converter begins resolving a project.
   *
   * Goes over the list of inherited reflections and removes any that are down the hierarchy
   * from a class that doesn't inherit docs.
   *
   * @param context The context object describing the current state the converter is in.
   */
  onBeginResolve(context) {
    if (this.noInherit) {
      const project = context.project;
      const removals = [];
      this.inheritedReflections.forEach((reflection) => {
        // Look through the inheritance chain for a reflection that is flagged as noInherit for this reflection
        if (this.isNoInheritRecursive(context, reflection, 0)) {
          removals.push(reflection);
        }
      });
      removals.forEach((removal) => {
        project.removeReflection(removal);
      });
    }
  }
  /**
   * Checks whether some DeclarationReflection is in the noInherit list.
   * @param search  The DeclarationReflection to search for in the list.
   */
  isNoInherit(search) {
    if (
      this.noInherit.find(
        (no) => no.id === search.id && no.name === search.name,
      )
    ) {
      return true;
    }
    return false;
  }
  /**
   * Checks whether some Reflection is in the inheritedReflections list.
   * @param search  The Reflection to search for in the list.
   */
  isInherited(search) {
    if (
      this.inheritedReflections.find(
        (inh) => inh.id === search.id && inh.name === search.name,
      )
    ) {
      return true;
    }
    return false;
  }
  /**
   * Checks whether some reflection's inheritance chain is broken by a class or interface that doesn't inherit docs.
   * @param context  The context object describing the current state the converter is in.
   * @param current  The current reflection being evaluated for non-inheritance.
   * @param depth  The current recursion depth, used for stopping on excessively long inheritance chains.
   */
  isNoInheritRecursive(context, current, depth) {
    if (depth > 20) {
      this.logger.warn(
        `Found inheritance chain with depth > 20, stopping no inherit check: ${current.getFullName()}`,
      );
      return false; // stop if we've recursed more than 20 times
    }
    // As we move up the chain, check if the reflection parent is in the noInherit list
    const parent = current.parent;
    if (!parent) return false;
    if (
      this.isNoInherit(parent) &&
      (depth === 0 || this.isInherited(current))
    ) {
      return true;
    }
    const checkExtended = (type) => {
      let _a;
      const extended =
        (_a = type) === null || _a === void 0 ? void 0 : _a.reflection;
      if (extended instanceof typedoc.Reflection) {
        const upLevel = extended.getChildByName(current.name);
        if (upLevel && this.isNoInheritRecursive(context, upLevel, depth + 1)) {
          return true;
        }
      }
      return false;
    };
    if (parent.extendedTypes) {
      if (parent.extendedTypes.some(checkExtended)) {
        return true;
      }
    }
    return false;
  }
}
