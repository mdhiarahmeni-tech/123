local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local remotesFolder = ReplicatedStorage:WaitForChild("Remotes")
local clickEvent = remotesFolder:WaitForChild("ClickEvent")
local purchaseEvent = remotesFolder:WaitForChild("PurchaseUpgrade")

local UpgradeConfig = require(ReplicatedStorage:WaitForChild("UpgradeConfig"))

local function getUpgradeCost(upgrade, level)
    return upgrade.baseCost * (level + 1)
end

local gui = Instance.new("ScreenGui")
    gui.Name = "ClickerGui"
    gui.ResetOnSpawn = false
    gui.Parent = player:WaitForChild("PlayerGui")

local mainFrame = Instance.new("Frame")
mainFrame.Name = "MainFrame"
mainFrame.Size = UDim2.new(0, 400, 0, 320)
mainFrame.Position = UDim2.new(0, 20, 0.5, -160)
mainFrame.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
mainFrame.Parent = gui

local titleLabel = Instance.new("TextLabel")
titleLabel.Name = "Title"
titleLabel.Size = UDim2.new(1, 0, 0, 40)
titleLabel.BackgroundTransparency = 1
titleLabel.Text = "Fast Clicker"
titleLabel.TextColor3 = Color3.fromRGB(255, 214, 79)
titleLabel.Font = Enum.Font.GothamBold
titleLabel.TextScaled = true
titleLabel.Parent = mainFrame

local goldLabel = Instance.new("TextLabel")
goldLabel.Name = "GoldLabel"
goldLabel.Size = UDim2.new(1, -20, 0, 40)
goldLabel.Position = UDim2.new(0, 10, 0, 45)
goldLabel.BackgroundTransparency = 1
goldLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
goldLabel.Font = Enum.Font.GothamBold
goldLabel.TextScaled = true
goldLabel.Text = "Gold: 0"
goldLabel.Parent = mainFrame

local clickButton = Instance.new("TextButton")
clickButton.Name = "ClickButton"
clickButton.Size = UDim2.new(1, -40, 0, 60)
clickButton.Position = UDim2.new(0, 20, 0, 95)
clickButton.BackgroundColor3 = Color3.fromRGB(65, 141, 255)
clickButton.Text = "Click to Earn"
clickButton.TextColor3 = Color3.fromRGB(255, 255, 255)
clickButton.Font = Enum.Font.GothamBold
clickButton.TextScaled = true
clickButton.Parent = mainFrame

local upgradesFrame = Instance.new("Frame")
upgradesFrame.Name = "UpgradesFrame"
upgradesFrame.Size = UDim2.new(1, -20, 0, 170)
upgradesFrame.Position = UDim2.new(0, 10, 0, 165)
upgradesFrame.BackgroundTransparency = 1
upgradesFrame.Parent = mainFrame

local layout = Instance.new("UIListLayout")
layout.FillDirection = Enum.FillDirection.Vertical
layout.HorizontalAlignment = Enum.HorizontalAlignment.Left
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Padding = UDim.new(0, 6)
layout.Parent = upgradesFrame

local function formatUpgradeText(upgrade, level)
    local cost = getUpgradeCost(upgrade, level)
    return string.format("%s (Lv %d) - %d Gold", upgrade.name, level, cost)
end

local upgradeButtons = {}
for index, upgrade in ipairs(UpgradeConfig) do
    local button = Instance.new("TextButton")
    button.Name = upgrade.id .. "Button"
    button.Size = UDim2.new(1, 0, 0, 28)
    button.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
    button.TextColor3 = Color3.fromRGB(255, 255, 255)
    button.Font = Enum.Font.Gotham
    button.TextScaled = true
    button.LayoutOrder = index
    button.Text = formatUpgradeText(upgrade, 0)
    button.Parent = upgradesFrame

    button.MouseButton1Click:Connect(function()
        purchaseEvent:FireServer(upgrade.id)
    end)

    upgradeButtons[upgrade.id] = button
end

local function updateGoldDisplay()
    local goldValue = player:FindFirstChild("Gold")
    if goldValue then
        goldLabel.Text = "Gold: " .. goldValue.Value
    end
end

local function updateUpgradeDisplay(upgradeId)
    local upgrade = nil
    for _, entry in ipairs(UpgradeConfig) do
        if entry.id == upgradeId then
            upgrade = entry
            break
        end
    end

    if not upgrade then
        return
    end

    local upgradeFolder = player:FindFirstChild("UpgradeLevels")
    if not upgradeFolder then
        return
    end

    local levelValue = upgradeFolder:FindFirstChild(upgradeId)
    if levelValue then
        local button = upgradeButtons[upgradeId]
        if button then
            button.Text = formatUpgradeText(upgrade, levelValue.Value)
        end
    end
end

local function bindUpgradeListeners()
    local upgradeFolder = player:WaitForChild("UpgradeLevels")
    for _, upgrade in ipairs(UpgradeConfig) do
        local levelValue = upgradeFolder:WaitForChild(upgrade.id)
        updateUpgradeDisplay(upgrade.id)
        levelValue.Changed:Connect(function()
            updateUpgradeDisplay(upgrade.id)
        end)
    end
end

clickButton.MouseButton1Click:Connect(function()
    clickEvent:FireServer()
end)

local goldValue = player:WaitForChild("Gold")
updateGoldDisplay()

goldValue.Changed:Connect(function()
    updateGoldDisplay()
end)

bindUpgradeListeners()
