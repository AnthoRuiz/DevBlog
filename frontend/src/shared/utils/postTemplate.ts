/** Prompts the editor recognises as template guidance (also used by the idea templates from the backend) */
export const GUIDE_PREFIX = '> ✍️';

/** Number of template prompts still in a post (lines starting with "> ✍️") */
export function countGuides(markdown: string): number {
  return markdown.split('\n').filter((line) => line.trimStart().startsWith(GUIDE_PREFIX)).length;
}

// A generic structure for posts started from scratch, shaped like the brand promise:
// a real setup, what I did, the numbers, what failed first and what I took away
const TEMPLATES: Record<'es' | 'en', string> = {
  es: `> ✍️ **Cómo usar esta plantilla:** cada línea con ✍️ es una guía. Escribe debajo con tus palabras y bórrala cuando termines; si queda alguna al publicar, el editor te avisa.

## Introducción

> ✍️ ¿De qué trata este post en una frase? ¿Por qué te importa a ti?
> ✍️ Engancha con algo concreto: algo que te pasó, un error o una pregunta que te hiciste.

## El contexto

> ✍️ ¿Qué problema querías resolver? ¿Qué tenías antes y por qué no te servía?

## Lo que hice

> ✍️ Cuenta los pasos en orden. Pega la config o los comandos que usaste.
> ✍️ ¿Qué alternativas descartaste y por qué?

## Lo que pasó

> ✍️ ¿Qué mediste? Antes y después, con unidades.
> ✍️ ¿Qué falló primero y cómo lo arreglaste?

## Lo que me llevo

> ✍️ ¿Qué harías distinto? ¿Qué le dirías a alguien que empieza hoy?
> ✍️ Cierra con una recomendación concreta: ¿qué debería hacer el lector mañana?
`,
  en: `> ✍️ **How to use this template:** every line with ✍️ is a prompt. Write below it in your own words and delete it when you're done; if any are left when you publish, the editor will warn you.

## Intro

> ✍️ What's this post about in one sentence? Why does it matter to you?
> ✍️ Hook the reader with something concrete: something that happened, a mistake or a question you had.

## The context

> ✍️ What problem were you trying to solve? What did you have before and why wasn't it enough?

## What I did

> ✍️ Walk through the steps in order. Paste the config or commands you used.
> ✍️ Which alternatives did you rule out, and why?

## What happened

> ✍️ What did you measure? Before and after, with units.
> ✍️ What failed first, and how did you fix it?

## What I took away

> ✍️ What would you do differently? What would you tell someone starting today?
> ✍️ Close with one concrete recommendation: what should the reader do tomorrow?
`,
};

export function blankPostTemplate(language: string): string {
  return TEMPLATES[language === 'es' ? 'es' : 'en'];
}
