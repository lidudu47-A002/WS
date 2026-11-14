import random

def guess_number_game():
    print("🎯 欢迎来到猜数字游戏！")
    print("规则：我心里想了一个 1 到 100 之间的整数，你有 7 次机会猜中它。\n")
    
    # 随机生成目标数字
    secret_number = random.randint(1, 100)
    attempts = 7
    
    for round_num in range(1, attempts + 1):
        print(f"--- 第 {round_num} 次猜测 ---")
        try:
            guess = int(input("请输入你的猜测数字 (1-100): "))
        except ValueError:
            print("❌ 无效输入，请输入一个整数。")
            continue
        
        if guess < 1 or guess > 100:
            print("⚠️ 数字超出范围，请保持在 1 到 100 之间。")
            continue
        
        if guess < secret_number:
            print("📈 猜小了！再试一次。")
        elif guess > secret_number:
            print("📉 猜大了！再试一次。")
        else:
            print(f"🎉 恭喜！你用了 {round_num} 次猜中了！数字就是 {secret_number}。")
            break
    else:
        print(f"\n😭 很遗憾，7 次机会用完了。正确答案是 {secret_number}。")
        print("下次加油哦！")

if __name__ == "__main__":
    guess_number_game()