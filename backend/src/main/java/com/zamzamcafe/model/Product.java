package com.zamzamcafe.model;
import jakarta.persistence.*;

@Entity
public class Product {
  @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
  private String name;
  @Column(length=1000) private String description;
  private Integer price;
  private String category;
  @Lob @Column(columnDefinition="LONGTEXT") private String imageUrl;
  private boolean available = true;
  public Long getId(){return id;} public void setId(Long id){this.id=id;}
  public String getName(){return name;} public void setName(String v){name=v;}
  public String getDescription(){return description;} public void setDescription(String v){description=v;}
  public Integer getPrice(){return price;} public void setPrice(Integer v){price=v;}
  public String getCategory(){return category;} public void setCategory(String v){category=v;}
  public String getImageUrl(){return imageUrl;} public void setImageUrl(String v){imageUrl=v;}
  public boolean isAvailable(){return available;} public void setAvailable(boolean v){available=v;}
}