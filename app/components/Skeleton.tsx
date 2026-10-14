// Squelettes de chargement : des blocs gris qui ont la forme de la page attendue,
// affiches seulement au premier chargement.

export function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

function Busy({ children }: { children: React.ReactNode }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement</span>
      {children}
    </div>
  );
}

// Texte generique : quelques lignes de longueurs differentes.
export function TextSkeleton() {
  return (
    <Busy>
      <div className="space-y-3 py-2">
        <Bone className="h-4 w-2/3" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-5/6" />
        <Bone className="h-4 w-1/2" />
      </div>
    </Busy>
  );
}

// Liste en carte : un titre et une ligne par element (liste des parcours).
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Busy>
      <div className="bg-surface border border-rule rounded-lg shadow-sm overflow-hidden">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="border-t border-rule first:border-t-0 px-5 py-5 space-y-3">
            <div className="flex justify-between gap-6">
              <Bone className="h-5 w-1/3" />
              <Bone className="h-4 w-16" />
            </div>
            <Bone className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </Busy>
  );
}

// Page Services : bandeau de titre, puis une ligne par service.
export function ServicesSkeleton() {
  return (
    <Busy>
      <div className="mb-6 rounded-lg bg-blue-50 px-5 py-4 space-y-3">
        <Bone className="h-7 w-1/3 bg-blue-100" />
        <Bone className="h-4 w-2/3 bg-blue-100" />
      </div>
      <div className="bg-surface border border-rule rounded-lg shadow-sm overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="border-t border-rule first:border-t-0 px-5 py-4 flex items-center gap-4">
            <Bone className="h-5 w-12" />
            <Bone className="h-4 w-1/3" />
            <Bone className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </Busy>
  );
}

// Detail d'un parcours : titre, introduction, puis des etapes.
export function JourneyDocSkeleton() {
  return (
    <Busy>
      <div className="space-y-8">
        <div className="rounded-lg bg-blue-50 px-5 py-4 space-y-3">
          <Bone className="h-7 w-2/5 bg-blue-100" />
          <Bone className="h-4 w-3/4 bg-blue-100" />
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-3">
            <Bone className="h-5 w-1/3" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </Busy>
  );
}

function IndicatorsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {Array.from({ length: 7 }, (_, i) => (
        <Bone key={i} className="h-16" />
      ))}
    </div>
  );
}

// Tableau de bord de la recette : synthese, puis une carte par parcours.
export function DashboardSkeleton() {
  return (
    <Busy>
      <div className="space-y-10">
        <section className="space-y-3">
          <Bone className="h-3 w-32" />
          <IndicatorsSkeleton />
        </section>
        <section className="space-y-3">
          <Bone className="h-3 w-40" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="bg-surface border border-rule rounded-lg shadow-sm p-5 space-y-4">
                <div className="flex justify-between gap-4">
                  <Bone className="h-6 w-1/2" />
                  <Bone className="h-4 w-10" />
                </div>
                <Bone className="h-2 w-full" />
                <Bone className="h-12 w-full" />
                <Bone className="h-4 w-28" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </Busy>
  );
}

// Recette d'un parcours : bandeau d'indicateurs, puis des etapes, la premiere depliee.
export function JourneyRecetteSkeleton() {
  return (
    <Busy>
      <div className="space-y-8">
        <div className="rounded-lg bg-blue-50 px-5 py-4 space-y-3">
          <Bone className="h-7 w-1/2 bg-blue-100" />
          <Bone className="h-10 w-full bg-blue-100" />
        </div>
        <Bone className="h-8 w-2/3" />
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-surface border border-rule rounded-lg overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <Bone className="h-5 w-1/3" />
                <Bone className="h-4 w-40" />
              </div>
              {i === 0 &&
                Array.from({ length: 4 }, (_, j) => (
                  <div key={j} className="border-t border-rule px-4 py-3 flex gap-4">
                    <Bone className="h-4 w-16" />
                    <Bone className="h-4 w-24" />
                    <Bone className="h-4 flex-1" />
                    <Bone className="h-4 flex-1" />
                    <Bone className="h-5 w-20 rounded-full" />
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </Busy>
  );
}
