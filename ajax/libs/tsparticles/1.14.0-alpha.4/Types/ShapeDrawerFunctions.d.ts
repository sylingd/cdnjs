import type { IParticle } from "../Core/Interfaces/IParticle";
import { Container } from "../Core/Container";
export declare type ShapeDrawerDrawFunction = (context: CanvasRenderingContext2D, particle: IParticle, radius: number, opacity: number) => void;
export declare type ShapeDrawerInitFunction = (container: Container) => Promise<void>;
export declare type ShapeDrawerAfterEffectFunction = (context: CanvasRenderingContext2D, particle: IParticle, radius: number, opacity: number) => void;
export declare type ShapeDrawerDestroyFunction = (container: Container) => void;
