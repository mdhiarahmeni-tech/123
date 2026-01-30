local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local UpgradeConfig = require(ReplicatedStorage:WaitForChild("UpgradeConfig"))

local dataStore = DataStoreService:GetDataStore("ClickerData_v1")

local remotesFolder = ReplicatedStorage:FindFirstChild("Remotes")
if not remotesFolder then
    remotesFolder = Instance.new("Folder")
    remotesFolder.Name = "Remotes"
    remotesFolder.Parent = ReplicatedStorage
end

local clickEvent = remotesFolder:FindFirstChild("ClickEvent")
if not clickEvent then
    clickEvent = Instance.new("RemoteEvent")
    clickEvent.Name = "ClickEvent"
    clickEvent.Parent = remotesFolder
end

local purchaseEvent = remotesFolder:FindFirstChild("PurchaseUpgrade")
if not purchaseEvent then
    purchaseEvent = Instance.new("RemoteEvent")
    purchaseEvent.Name = "PurchaseUpgrade"
    purchaseEvent.Parent = remotesFolder
end

local function getUpgradeData()
    local map = {}
    for _, upgrade in ipairs(UpgradeConfig) do
        map[upgrade.id] = upgrade
    end
    return map
end

local upgradeMap = getUpgradeData()

local function calculateGoldPerClick(upgradeFolder)
    local total = 1
    for _, upgrade in ipairs(UpgradeConfig) do
        local levelValue = upgradeFolder:FindFirstChild(upgrade.id)
        if levelValue then
            total += levelValue.Value * upgrade.bonusPerLevel
        end
    end
    return total
end

local function applyGoldPerClick(player)
    local upgradeFolder = player:FindFirstChild("UpgradeLevels")
    local goldPerClickValue = player:FindFirstChild("GoldPerClick")
    if upgradeFolder and goldPerClickValue then
        goldPerClickValue.Value = calculateGoldPerClick(upgradeFolder)
    end
end

local function setupLeaderstats(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player

    local totalGold = Instance.new("IntValue")
    totalGold.Name = "TotalGold"
    totalGold.Value = 0
    totalGold.Parent = leaderstats
end

local function createUpgradeFolder(player)
    local upgradeFolder = Instance.new("Folder")
    upgradeFolder.Name = "UpgradeLevels"
    upgradeFolder.Parent = player

    for _, upgrade in ipairs(UpgradeConfig) do
        local levelValue = Instance.new("IntValue")
        levelValue.Name = upgrade.id
        levelValue.Value = 0
        levelValue.Parent = upgradeFolder
    end

    return upgradeFolder
end

local function createPlayerStats(player)
    local goldValue = Instance.new("IntValue")
    goldValue.Name = "Gold"
    goldValue.Value = 0
    goldValue.Parent = player

    local goldPerClickValue = Instance.new("IntValue")
    goldPerClickValue.Name = "GoldPerClick"
    goldPerClickValue.Value = 1
    goldPerClickValue.Parent = player

    return goldValue, goldPerClickValue
end

local function loadPlayerData(player)
    local goldValue = player:FindFirstChild("Gold")
    local totalGoldValue = player:FindFirstChild("leaderstats") and player.leaderstats:FindFirstChild("TotalGold")
    local upgradeFolder = player:FindFirstChild("UpgradeLevels")

    local success, data = pcall(function()
        return dataStore:GetAsync("Player_" .. player.UserId)
    end)

    if success and data then
        goldValue.Value = data.Gold or 0
        totalGoldValue.Value = data.TotalGold or goldValue.Value
        for id, level in pairs(data.Upgrades or {}) do
            local levelValue = upgradeFolder:FindFirstChild(id)
            if levelValue then
                levelValue.Value = level
            end
        end
    end

    applyGoldPerClick(player)
end

local function savePlayerData(player)
    local goldValue = player:FindFirstChild("Gold")
    local totalGoldValue = player:FindFirstChild("leaderstats") and player.leaderstats:FindFirstChild("TotalGold")
    local upgradeFolder = player:FindFirstChild("UpgradeLevels")

    if not goldValue or not totalGoldValue or not upgradeFolder then
        return
    end

    local upgradeData = {}
    for _, upgrade in ipairs(UpgradeConfig) do
        local levelValue = upgradeFolder:FindFirstChild(upgrade.id)
        if levelValue then
            upgradeData[upgrade.id] = levelValue.Value
        end
    end

    local payload = {
        Gold = goldValue.Value,
        TotalGold = totalGoldValue.Value,
        Upgrades = upgradeData,
    }

    pcall(function()
        dataStore:SetAsync("Player_" .. player.UserId, payload)
    end)
end

Players.PlayerAdded:Connect(function(player)
    setupLeaderstats(player)
    createUpgradeFolder(player)
    createPlayerStats(player)
    loadPlayerData(player)
end)

Players.PlayerRemoving:Connect(function(player)
    savePlayerData(player)
end)

clickEvent.OnServerEvent:Connect(function(player)
    local goldValue = player:FindFirstChild("Gold")
    local totalGoldValue = player:FindFirstChild("leaderstats") and player.leaderstats:FindFirstChild("TotalGold")
    local goldPerClickValue = player:FindFirstChild("GoldPerClick")

    if not goldValue or not totalGoldValue or not goldPerClickValue then
        return
    end

    goldValue.Value += goldPerClickValue.Value
    totalGoldValue.Value += goldPerClickValue.Value
end)

purchaseEvent.OnServerEvent:Connect(function(player, upgradeId)
    local upgradeInfo = upgradeMap[upgradeId]
    if not upgradeInfo then
        return
    end

    local goldValue = player:FindFirstChild("Gold")
    local upgradeFolder = player:FindFirstChild("UpgradeLevels")

    if not goldValue or not upgradeFolder then
        return
    end

    local levelValue = upgradeFolder:FindFirstChild(upgradeId)
    if not levelValue then
        return
    end

    local cost = upgradeInfo.baseCost * (levelValue.Value + 1)
    if goldValue.Value < cost then
        return
    end

    goldValue.Value -= cost
    levelValue.Value += 1

    applyGoldPerClick(player)
end)

task.spawn(function()
    while true do
        task.wait(60)
        for _, player in ipairs(Players:GetPlayers()) do
            savePlayerData(player)
        end
    end
end)
