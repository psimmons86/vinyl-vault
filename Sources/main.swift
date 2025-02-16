import Foundation

// Record structure
struct Record: Codable {
    var title: String
    var artist: String
    var plays: Int
}

// Function to display the main menu
func displayMenu() {
    print("Welcome to Vinyl Vault!")
    print("1. Input a new record")
    print("2. Track plays")
    print("3. View statistics")
    print("4. Fetch record from Discogs")
    print("5. Exit")
}

// Function to input a new record
func inputNewRecord() -> Record? {
    print("Enter record title:")
    guard let title = readLine(), !title.isEmpty else {
        print("Invalid title.")
        return nil
    }
    
    print("Enter artist name:")
    guard let artist = readLine(), !artist.isEmpty else {
        print("Invalid artist name.")
        return nil
    }
    
    return Record(title: title, artist: artist, plays: 0)
}

// Function to track plays for a record
func trackPlays(records: inout [Record]) {
    print("Select a record to track plays:")
    for (index, record) in records.enumerated() {
        print("\(index + 1). \(record.title) by \(record.artist) - Plays: \(record.plays)")
    }
    
    guard let choice = readLine(), let index = Int(choice), index > 0, index <= records.count else {
        print("Invalid selection.")
        return
    }
    
    records[index - 1].plays += 1
    print("Updated plays for \(records[index - 1].title): \(records[index - 1].plays) plays.")
}

// Function to view statistics
func viewStatistics(records: [Record]) {
    print("Statistics:")
    for record in records {
        print("\(record.title) by \(record.artist) - Plays: \(record.plays)")
    }
}

// Function to fetch record from Discogs API
func fetchRecordFromDiscogs() {
    print("Enter record title to search on Discogs:")
    guard let title = readLine(), !title.isEmpty else {
        print("Invalid title.")
        return
    }
    
    let apiKey = ProcessInfo.processInfo.environment["DISCOGS_API_KEY"] ?? ""
    let apiSecret = ProcessInfo.processInfo.environment["DISCOGS_API_SECRET"] ?? ""
    let urlString = "https://api.discogs.com/database/search?q=\(title)&key=\(apiKey)&secret=\(apiSecret)"
    
    guard let url = URL(string: urlString) else {
        print("Invalid URL.")
        return
    }
    
    let task = URLSession.shared.dataTask(with: url) { data, response, error in
        if let error = error {
            print("Error fetching data: \(error.localizedDescription)")
            return
        }
        
        guard let data = data else {
            print("No data received.")
            return
        }
        
        do {
            let decoder = JSONDecoder()
            let result = try decoder.decode(DiscogsResponse.self, from: data)
            print("Records found:")
            for record in result.results {
                print("\(record.title) by \(record.artist)")
            }
        } catch {
            print("Error decoding JSON: \(error.localizedDescription)")
        }
    }
    
    task.resume()
}

var shouldContinue = true
var records: [Record] = []

print("Starting Vinyl Vault...") // Added log to indicate the app has started

while shouldContinue {
    displayMenu()
    if let choice = readLine() {
        switch choice {
        case "1":
            if let newRecord = inputNewRecord() {
                records.append(newRecord)
                print("Record added: \(newRecord.title) by \(newRecord.artist)")
            }
        case "2":
            trackPlays(records: &records)
        case "3":
            viewStatistics(records: records)
        case "4":
            fetchRecordFromDiscogs()
        case "5":
            shouldContinue = false
            print("Exiting...")
        default:
            print("Invalid choice. Please try again.")
        }
    } else {
        print("No input received. Please try again.")
    }
}

// Discogs API response structure
struct DiscogsResponse: Codable {
    var results: [DiscogsRecord]
}

struct DiscogsRecord: Codable {
    var title: String
    var artist: String
}
