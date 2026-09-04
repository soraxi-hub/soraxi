# OO Design Principles

This document summarizes the core object-oriented design principles introduced in _Head First Design Patterns_ (2nd Edition, 2020). These principles serve as the foundation for the patterns discussed throughout the book and provide a guide for building flexible, maintainable, and extensible software.

## Chapter 1: Welcome to Design Patterns

- **Identify the aspects of your application that vary and separate them from what stays the same.**
  - **Explanation:** Take the parts that vary and encapsulate them, so that later you can alter or extend the parts that vary without affecting those that don't.
- **Program to an interface, not an implementation.**
  - **Explanation:** This means that the declared type of the variables should be a supertype, usually an abstract class or interface, so that the objects assigned to those variables can be of any concrete implementation of the supertype.
- **Favor composition over inheritance.**
  - **Explanation:** Instead of inheriting behavior from a superclass, objects get their behavior by being composed with the right behavior object. This allows for more flexibility, such as changing behavior at runtime.

## Chapter 2: The Observer Pattern

- **Strive for loosely coupled designs between objects that interact.**
  - **Explanation:** Loosely coupled designs allow us to build flexible OO systems that can handle change because they minimize the interdependency between objects.

## Chapter 3: The Decorator Pattern

- **Classes should be open for extension, but closed for modification.**
  - **Explanation:** This is known as the **Open-Closed Principle**. The goal is to allow classes to be easily extended to incorporate new behavior without modifying existing code.

## Chapter 4: The Factory Pattern

- **Depend upon abstractions. Do not depend upon concrete classes.**
  - **Explanation:** This principle, the **Dependency Inversion Principle**, suggests that high-level components should not depend on low-level components; rather, they should both depend on abstractions.

## Chapter 7: The Adapter and Facade Patterns

- **Principle of Least Knowledge: talk only to your immediate friends.**
  - **Explanation:** This principle (also known as the Law of Demeter) suggests that we should be careful about the number of classes an object interacts with and how it comes to interact with them.

## Chapter 8: The Template Method Pattern

- **The Hollywood Principle: Don’t call us, we’ll call you.**
  - **Explanation:** This principle guides us to put decision-making in high-level modules that can decide how and when to call low-level modules.

## Chapter 9: The Iterator and Composite Patterns

- **A class should have only one reason to change.**
  - **Explanation:** This is the **Single Responsibility Principle**. Every responsibility of a class is an area of potential change. More than one responsibility means more than one area of change.
