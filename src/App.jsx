import React from "react";
import { PageContainer, GraphProvider, PageContents } from "./components";

function App() {
  return (
    <PageContainer>
      <GraphProvider>
        <PageContents />
      </GraphProvider>
    </PageContainer>
  );
}

export default App;
