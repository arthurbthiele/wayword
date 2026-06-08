import React, { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import {
  fetchDefinition,
  type DefinitionResult,
} from "../utilities/fetchDefinition";

type DefinitionModalProps = {
  word: string | null;
  onClose: () => void;
};

export const DefinitionModal = ({ word, onClose }: DefinitionModalProps) => {
  const [result, setResult] = useState<DefinitionResult | null>(null);

  useEffect(() => {
    if (!word) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setResult(null);
    fetchDefinition(word).then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, [word]);

  return (
    <Modal
      open={word !== null}
      onClose={onClose}
      ariaLabel={word ? `Definition of ${word}` : "Definition"}
    >
      <div className="wj-def">{word && renderBody(word, result)}</div>
    </Modal>
  );
};

const renderBody = (word: string, result: DefinitionResult | null) => {
  if (!result) {
    return (
      <>
        <h2>{word}</h2>
        <p className="wj-def__loading">Looking up…</p>
      </>
    );
  }

  if (result.status === "ok") {
    const data = result.data;
    return (
      <>
        <h2>
          {data.word}
          {data.phonetic && (
            <span className="wj-def__phonetic"> {data.phonetic}</span>
          )}
        </h2>
        {data.meanings.length === 0 ? (
          <p>No definitions found.</p>
        ) : (
          data.meanings.map((meaning, idx) => (
            <div key={idx} className="wj-def__meaning">
              <h3>{meaning.partOfSpeech}</h3>
              <ol>
                {meaning.definitions.slice(0, 3).map((definition, i) => (
                  <li key={i}>
                    {definition.definition}
                    {definition.example && (
                      <div className="wj-def__example">
                        "{definition.example}"
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))
        )}
        <p className="wj-def__credit">
          Definitions via{" "}
          <a
            href="https://dictionaryapi.dev/"
            target="_blank"
            rel="noopener noreferrer"
          >
            dictionaryapi.dev
          </a>
        </p>
      </>
    );
  }

  // not_found OR error — same surface to the player, different lead text.
  return (
    <>
      <h2>{word}</h2>
      <p>
        {result.status === "not_found"
          ? "No definition available in our dictionary."
          : "Couldn't load a definition just now."}
      </p>
      <p>
        <a
          href={`https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Look up '{word}' on Wiktionary →
        </a>
      </p>
    </>
  );
};
