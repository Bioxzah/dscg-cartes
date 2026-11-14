// Watches the DSCG Google Drive folder (recursively, with FSEvents) and runs process.sh after
// a drop, once the folder has been quiet for a while. Also runs it at start and every 6 hours,
// to catch anything missed while the Mac was asleep. Idle cost: none (kernel notifications).
// Usage: dscg-watch <process.sh> <folder to watch>
import Foundation
import CoreServices

let args = CommandLine.arguments
guard args.count == 3 else {
  FileHandle.standardError.write("usage: dscg-watch <process.sh> <folder>\n".data(using: .utf8)!)
  exit(2)
}
let script = args[1]
let folder = args[2]
let quiet: TimeInterval = 30
var pending: DispatchWorkItem?
var running: Process?

@Sendable func log(_ s: String) { print("[\(Date())] \(s)"); fflush(stdout) }

func run(_ reason: String) {
  if let p = running, p.isRunning { log("déjà en cours, \(reason) ignoré"); return }
  log("lancement (\(reason))")
  let p = Process()
  p.executableURL = URL(fileURLWithPath: "/bin/bash")
  p.arguments = [script]
  p.qualityOfService = .background
  do { try p.run(); running = p } catch { log("échec du lancement : \(error)") }
}

func schedule(_ reason: String) {
  pending?.cancel()
  let item = DispatchWorkItem { run(reason) }
  pending = item
  DispatchQueue.main.asyncAfter(deadline: .now() + quiet, execute: item)
}

let callback: FSEventStreamCallback = { _, _, count, paths, _, _ in
  let list = unsafeBitCast(paths, to: NSArray.self) as? [String] ?? []
  // Our own output (the fiche PDF) must not retrigger a run.
  let relevant = list.prefix(count).filter { !$0.contains("/Fiche - Chapitre") && !$0.contains("/.") }
  if !relevant.isEmpty { schedule("changement : \(relevant.first!)") }
}

guard let stream = FSEventStreamCreate(nil, callback, nil, [folder] as CFArray,
  FSEventStreamEventId(kFSEventStreamEventIdSinceNow), 5.0,
  FSEventStreamCreateFlags(kFSEventStreamCreateFlagFileEvents | kFSEventStreamCreateFlagNoDefer | kFSEventStreamCreateFlagUseCFTypes)) else {
  log("impossible de surveiller \(folder)")
  exit(1)
}
FSEventStreamSetDispatchQueue(stream, DispatchQueue.main)
FSEventStreamStart(stream)
log("surveillance de \(folder)")

schedule("démarrage")
Timer.scheduledTimer(withTimeInterval: 6 * 3600, repeats: true) { _ in run("contrôle périodique") }
RunLoop.main.run()
