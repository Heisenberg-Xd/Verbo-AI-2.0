const fs = require('fs');

let code = fs.readFileSync('c:/Users/KARTIKESH/Downloads/VerboAI/frontend/src/pages/IntelligenceDashboard.jsx', 'utf8');

// The first split point is right before `<div className="topbar">`
const startIdx = code.indexOf('<div className="topbar">');
if (startIdx === -1) {
    console.error("Could not find start point.");
    process.exit(1);
}

// The second split point is right after the modal code
const endAnchor = "modalFile && (";
let endIdx = code.lastIndexOf(endAnchor);

if (endIdx === -1) {
    console.error("Could not find end point.");
    process.exit(1);
}

// Rewind the end index up to `{/*` before it.
while (endIdx > 0 && code.substr(endIdx, 3) !== "{/*") {
    endIdx--;
}

const newContent = code.substring(0, startIdx) + `<HeaderBar ragReady={ragReady} />
          <StatsOverview stats={{show: clusters!=null, totalFiles, clusterCount, translatedCount: Object.keys(translatedFiles).length, ragReady, languagesCount: Object.keys(overallLang).length}} />
          
          <div className="workspace">
            <div>
              <UploadPanel 
                sidebarTab={sidebarTab} setSidebarTab={setSidebarTab}
                workspaceId={workspaceId} setWorkspaceId={setWorkspaceId}
                files={files} fileThumbs={fileThumbs} dragOver={dragOver} setDragOver={setDragOver}
                fileInputRef={fileInputRef} handleFileChange={handleFileChange}
                loading={loading} handleUpload={handleUpload} error={error}
                driveUrl={driveUrl} setDriveUrl={setDriveUrl} ingestDrive={ingestDrive} driveLoading={driveLoading} driveResult={driveResult}
                intelligenceRep={intelligenceRep} totalFiles={totalFiles} clusterCount={clusterCount}
                overallLang={overallLang} entities={entities} relationships={relationships}
                runEntityExtraction={runEntityExtraction} entityLoading={entityLoading} clusters={clusters}
                dlReport={dlReport} runRelationshipExtraction={runRelationshipExtraction} buildKnowledgeGraph={buildKnowledgeGraph}
              />
            </div>
            
            <div>
              <ClusterAnalysisSection 
                elbowGraph={elbowGraph} silhouetteGraph={silhouetteGraph}
                clusters={clusters} clusterCount={clusterCount} insightData={insightData}
                vizData={vizData} overallLang={overallLang} ragReady={ragReady}
                activeTab={activeTab} setActiveTab={setActiveTab}
                summaries={summaries} expandedSummaries={expandedSummaries} setExpandedSummaries={setExpandedSummaries} keywords={keywords}
                activeCluster={activeCluster} setActiveCluster={setActiveCluster} sentiment={sentiment} repDocs={repDocs} langDist={langDist}
                runEntityExtraction={runEntityExtraction} entityLoading={entityLoading} runRelationshipExtraction={runRelationshipExtraction}
                buildKnowledgeGraph={buildKnowledgeGraph} intelligenceRep={intelligenceRep} dlReport={dlReport}
                knowledgeGraph={knowledgeGraph} entityList={entityList} relationshipList={relationshipList} entities={entities} relationships={relationships}
                chatFilter={chatFilter} setChatFilter={setChatFilter} chatTopK={chatTopK} setChatTopK={setChatTopK}
                chatMessages={chatMessages} chatLoading={chatLoading} chatError={chatError} chatInput={chatInput}
                setChatInput={setChatInput} sendChat={sendChat} expandedSources={expandedSources} setExpandedSources={setExpandedSources}
              />
            </div>
          </div>
        </div>

        ` + code.substring(endIdx);

fs.writeFileSync('c:/Users/KARTIKESH/Downloads/VerboAI/frontend/src/pages/IntelligenceDashboard.jsx', newContent);
console.log("Successfully constructed IntelligenceDashboard!");
