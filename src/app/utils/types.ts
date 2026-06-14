/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionFunctionArgs, LoaderFunctionArgs, TypedDeferredData } from "@remix-run/node";

export type ActionOrLoaderReturnType<T extends (args: LoaderFunctionArgs | ActionFunctionArgs) => Promise<{ json(): Promise<any> }>> = Awaited<ReturnType<Awaited<ReturnType<T>>['json']>>

export type DeferredActionOrLoaderReturnType<T extends (args: LoaderFunctionArgs | ActionFunctionArgs) => Promise<TypedDeferredData<any>>> = Awaited<ReturnType<T>>['data']
